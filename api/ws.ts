import { WebSocketServer, WebSocket } from "ws";
import type { WSMessage } from "@shared/types";
import { LOCAL_USER_ID } from "./routes/auth";

interface ClientMeta {
  ws: WebSocket;
  userId: string | null;
  deviceId: string | null;
}

const clients = new Map<WebSocket, ClientMeta>();

export function initWS(wss: WebSocketServer) {
  wss.on("connection", (ws) => {
    // 去除登录系统：连接即归属默认本地用户
    const meta: ClientMeta = { ws, userId: LOCAL_USER_ID, deviceId: null };
    clients.set(ws, meta);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSMessage;
        handleClientMessage(ws, msg);
      } catch {
        // 忽略非法消息
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });
}

function handleClientMessage(ws: WebSocket, msg: WSMessage) {
  const meta = clients.get(ws);
  if (!meta) return;

  if (msg.type === "subscribe") {
    meta.userId = msg.userId;
  }
  if (msg.type === "heartbeat") {
    // 心跳，仅维持连接
  }
}

// 向同账号所有在线设备广播
export function broadcast(userId: string, message: WSMessage) {
  for (const [, meta] of clients) {
    if (meta.userId === userId && meta.ws.readyState === WebSocket.OPEN) {
      meta.ws.send(JSON.stringify(message));
    }
  }
}

// 向所有连接广播（设备上下线等全局事件）
export function broadcastAll(message: WSMessage) {
  for (const [, meta] of clients) {
    if (meta.ws.readyState === WebSocket.OPEN) {
      meta.ws.send(JSON.stringify(message));
    }
  }
}
