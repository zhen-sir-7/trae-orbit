import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import "./db";
import { initWS } from "./ws";
import { initDiscovery } from "./discovery";
import { nodeInfo } from "./node";
import { deviceRouter } from "./routes/devices";
import { capsuleRouter } from "./routes/capsules";
import { agentRouter } from "./routes/agents";
import { nodeRouter } from "./routes/nodes";
import { authRouter } from "./routes/auth";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
// 查找前端 dist 目录：便携模式（server.mjs 与 dist 同目录）优先，回退开发模式（dist-server/../dist）
const distCandidates = [
  join(__dirname, "dist"),        // 便携/打包模式
  join(__dirname, "..", "dist"),  // 开发模式
];
const distDir = distCandidates.find((d) => existsSync(d)) || distCandidates[0];

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// REST 路由
app.use("/api/auth", authRouter);  // 认证路由（注册/登录/登出/me）
app.use("/api/devices", deviceRouter);
app.use("/api/capsules", capsuleRouter);
app.use("/api/agents", agentRouter);
app.use("/api/nodes", nodeRouter);

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "trae-orbit", node: nodeInfo.id, time: new Date().toISOString() });
});

// 前端静态资源托管（构建产物 dist/）
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  // 多入口 SPA fallback：/ → index.html，/phone.html → phone.html，/desktop.html → desktop.html
  app.get(/^\/(?!api|ws|node).*/, (req, res, next) => {
    const p = req.path;
    let file = "index.html";
    if (p === "/phone.html") file = "phone.html";
    else if (p === "/desktop.html") file = "desktop.html";
    const full = join(distDir, file);
    if (existsSync(full)) {
      res.sendFile(full);
    } else {
      next();
    }
  });
}

const server = createServer(app);

// noServer 模式：两个 WebSocketServer 共享同一 HTTP server
// 手动根据 path 分发 upgrade 事件，避免冲突导致 400
const clientWss = new WebSocketServer({ noServer: true });
const nodeWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathname = url.pathname;
  if (pathname === "/ws") {
    clientWss.handleUpgrade(req, socket, head, (ws) => {
      clientWss.emit("connection", ws, req);
    });
  } else if (pathname === "/node") {
    nodeWss.handleUpgrade(req, socket, head, (ws) => {
      nodeWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

initWS(clientWss);
initDiscovery(nodeWss, server);

server.listen(PORT, () => {
  console.log(`\n  TRAE Orbit 联邦节点已启动`);
  console.log(`  节点 ID:  ${nodeInfo.id}`);
  console.log(`  REST:     http://${nodeInfo.host}:${PORT}/api`);
  console.log(`  WS 客户端: ws://${nodeInfo.host}:${PORT}/ws`);
  console.log(`  WS 节点:  ws://${nodeInfo.host}:${PORT}/node\n`);
});
