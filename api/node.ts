// 节点身份管理：每个运行实例是一个对等节点
// 联邦式去中心化架构 —— 以用户为中心的开发者工具

import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR
  ? (isAbsolute(process.env.DATA_DIR)
    ? process.env.DATA_DIR
    : join(__dirname, "..", process.env.DATA_DIR))
  : join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const nodeFile = join(dataDir, "node.json");

export interface NodeInfo {
  id: string;          // 节点唯一 ID（持久化）
  name: string;        // 节点名称（hostname）
  host: string;        // 局域网 IP
  port: number;        // 服务端口
  startedAt: string;   // 本次启动时间
}

function getLanIP(): string {
  const ifaces = networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

function loadOrCreateNodeId(): { id: string; name: string } {
  if (existsSync(nodeFile)) {
    try {
      const data = JSON.parse(readFileSync(nodeFile, "utf-8"));
      return { id: data.id, name: data.name };
    } catch {
      // 损坏则重建
    }
  }
  // 生成节点 ID：node-<hostname 短哈希>
  const host = hostname();
  const id = `node-${host.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`;
  const name = host;
  writeFileSync(nodeFile, JSON.stringify({ id, name }, null, 2));
  return { id, name };
}

const { id: NODE_ID, name: NODE_NAME } = loadOrCreateNodeId();
const PORT = Number(process.env.PORT) || 8787;

export const nodeInfo: NodeInfo = {
  id: NODE_ID,
  name: NODE_NAME,
  host: getLanIP(),
  port: PORT,
  startedAt: new Date().toISOString(),
};

export function getNodeInfo() {
  return nodeInfo;
}
