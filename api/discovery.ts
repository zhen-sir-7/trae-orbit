// 联邦节点发现 + WebSocket mesh 互连
// mDNS 局域网自动发现 + 节点间对等通信 + 操作日志同步

import { Bonjour } from "bonjour-service";
import { WebSocket } from "ws";
import { db } from "./db";
import { nodeInfo } from "./node";
import { getUnsyncedOps, markSynced, applyRemoteOps } from "./sync";
import { broadcastAll } from "./ws";
import type { NodeMessage, NodeRecord, OpLogEntry } from "@shared/types";

const nodePeers = new Map<string, WebSocket>(); // nodeId → ws
let bonjourInstance: Bonjour | null = null;

export function initDiscovery(wss: import("ws").WebSocketServer, _server: import("node:http").Server) {
  // 1. 节点间 WebSocket 连接处理
  wss.on("connection", (ws) => {
    attachNodeHandlers(ws);
  });

  // 2. mDNS 广播 + 发现
  try {
    bonjourInstance = new Bonjour();
    bonjourInstance.publish({
      name: nodeInfo.id,
      type: "trae-orbit",
      port: nodeInfo.port,
      host: nodeInfo.host,
    });
    const browser = bonjourInstance.find({ type: "trae-orbit" });
    browser.on("up", (service) => {
      if (service.name === nodeInfo.id) return;
      const host = service.host || service.referer?.address;
      const port = service.port;
      if (!host || !port) return;
      upsertNode(service.name, host, port);
      connectToNode(host, port, service.name);
    });
    console.log(`[node] mDNS 广播中：${nodeInfo.id} @ ${nodeInfo.host}:${nodeInfo.port}`);
  } catch (err) {
    console.warn("[node] mDNS 不可用，仅支持手动添加节点", (err as Error).message);
  }

  // 3. 定期心跳 + 重连离线节点
  setInterval(heartbeatAndReconnect, 15000);
  // 4. 定期同步未同步操作
  setInterval(syncToNodes, 5000);
}

function attachNodeHandlers(ws: WebSocket) {
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as NodeMessage;
      handleNodeMessage(ws, msg);
    } catch {
      // 忽略非法消息
    }
  });
  ws.on("close", () => {
    for (const [nid, peerWs] of nodePeers) {
      if (peerWs === ws) {
        nodePeers.delete(nid);
        updateNodeOnline(nid, false);
        break;
      }
    }
  });
  ws.on("error", () => {
    // 连接错误，close 会处理清理
  });
}

function handleNodeMessage(ws: WebSocket, msg: NodeMessage) {
  switch (msg.type) {
    case "node:hello": {
      const node = msg.node;
      console.log(`[node] 收到 hello: ${node.id}`);
      nodePeers.set(node.id, ws);
      upsertNode(node.id, node.host, node.port);
      updateNodeOnline(node.id, true);
      // 回复 welcome + 已知节点 + 未同步操作
      const knownNodes = getNodes().filter((n) => n.id !== node.id && !n.isSelf);
      send(ws, { type: "node:welcome", node: selfNodeRecord(), knownNodes });
      const ops = getUnsyncedOps();
      if (ops.length) {
        console.log(`[node] 发送 ${ops.length} 条未同步操作给 ${node.id}`);
        send(ws, { type: "node:sync", ops });
      }
      break;
    }
    case "node:welcome": {
      console.log(`[node] 收到 welcome: ${msg.node.id}, 已知节点 ${msg.knownNodes.length} 个`);
      nodePeers.set(msg.node.id, ws);
      upsertNode(msg.node.id, msg.node.host, msg.node.port);
      updateNodeOnline(msg.node.id, true);
      // 学习更多节点并连接
      for (const n of msg.knownNodes) {
        upsertNode(n.id, n.host, n.port);
        if (!nodePeers.has(n.id) && n.id !== nodeInfo.id) {
          connectToNode(n.host, n.port, n.id);
        }
      }
      break;
    }
    case "node:sync": {
      const applied = applyRemoteOps(msg.ops);
      if (applied > 0) {
        console.log(`[node] 应用了 ${applied} 条远程操作`);
        // 提取涉及的 capsuleId，通知本地客户端
        const capsuleIds = new Set<string>();
        for (const op of msg.ops) {
          if (op.nodeId === nodeInfo.id) continue;
          if (op.entity === "capsules") {
            capsuleIds.add(op.recordId);
          } else if (op.entity === "timeline_events" || op.entity === "log_lines") {
            try {
              const p = JSON.parse(op.payload);
              if (p.capsule_id) capsuleIds.add(p.capsule_id);
            } catch {}
          }
        }
        for (const cid of capsuleIds) {
          broadcastAll({ type: "capsule:update", capsuleId: cid });
        }
      }
      break;
    }
    case "node:claim": {
      db.prepare("UPDATE capsules SET claimed_by = ? WHERE id = ?").run(msg.nodeId, msg.capsuleId);
      broadcastAll({ type: "capsule:update", capsuleId: msg.capsuleId });
      break;
    }
    case "node:heartbeat":
      break;
  }
}

function connectToNode(host: string, port: number, nodeId: string) {
  if (nodePeers.has(nodeId) || nodeId === nodeInfo.id) return;
  console.log(`[node] 尝试连接: ws://${host}:${port}/node (${nodeId})`);
  const ws = new WebSocket(`ws://${host}:${port}/node`);
  ws.on("open", () => {
    console.log(`[node] 连接已建立: ${nodeId}`);
    nodePeers.set(nodeId, ws);
    send(ws, { type: "node:hello", node: selfNodeRecord() });
  });
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as NodeMessage;
      handleNodeMessage(ws, msg);
    } catch {}
  });
  ws.on("close", (code, reason) => {
    console.log(`[node] 连接关闭: ${nodeId} (code=${code})`);
    if (nodePeers.get(nodeId) === ws) {
      nodePeers.delete(nodeId);
      updateNodeOnline(nodeId, false);
    }
  });
  ws.on("error", (err) => {
    console.error(`[node] 连接错误: ${nodeId} - ${err.message}`);
    nodePeers.delete(nodeId);
  });
}

function send(ws: WebSocket, msg: NodeMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// 广播消息给所有已连接节点
export function broadcastToNodes(msg: NodeMessage) {
  for (const [, ws] of nodePeers) {
    send(ws, msg);
  }
}

// 同步未同步操作到所有节点
export function syncToNodes() {
  const ops = getUnsyncedOps();
  if (ops.length === 0) return;
  broadcastToNodes({ type: "node:sync", ops });
  markSynced(ops.map((o) => o.id));
}

// 手动连接节点（API 调用）
export function connectToRemoteNode(host: string, port: number, nodeId?: string) {
  const id = nodeId || `node-manual-${Date.now()}`;
  upsertNode(id, host, port);
  connectToNode(host, port, id);
}

function upsertNode(id: string, host: string, port: number) {
  const name = id.startsWith("node-") ? id.slice(5, 11) : id;
  db.prepare(
    `INSERT OR IGNORE INTO nodes (id, name, host, port, online, added_at) VALUES (?, ?, ?, ?, 0, ?)`
  ).run(id, name, host, port, new Date().toISOString());
}

function updateNodeOnline(id: string, online: boolean) {
  db.prepare("UPDATE nodes SET online = ?, last_seen = ? WHERE id = ?").run(
    online ? 1 : 0,
    new Date().toISOString(),
    id
  );
  broadcastAll({ type: "node:list", nodes: getNodes() });
}

export function getNodes(): NodeRecord[] {
  const rows = db.prepare("SELECT * FROM nodes ORDER BY online DESC, name ASC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    host: r.host,
    port: r.port,
    online: !!r.online,
    lastSeen: r.last_seen ?? undefined,
    isSelf: r.id === nodeInfo.id,
  }));
}

function selfNodeRecord(): NodeRecord {
  return {
    id: nodeInfo.id,
    name: nodeInfo.name,
    host: nodeInfo.host,
    port: nodeInfo.port,
    online: true,
    isSelf: true,
  };
}

function heartbeatAndReconnect() {
  // 心跳
  for (const [, ws] of nodePeers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "node:heartbeat" }));
    } else {
      // 连接已断开，清理
      for (const [nid, peerWs] of nodePeers) {
        if (peerWs === ws) {
          nodePeers.delete(nid);
          updateNodeOnline(nid, false);
          break;
        }
      }
    }
  }
  // 重连离线节点
  const offlineNodes = db
    .prepare("SELECT * FROM nodes WHERE online = 0 AND id != ?")
    .all(nodeInfo.id) as any[];
  for (const n of offlineNodes) {
    if (!nodePeers.has(n.id)) {
      connectToNode(n.host, n.port, n.id);
    }
  }
}
