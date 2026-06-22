// 节点管理 API：列出已知节点、手动添加、删除

import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "./auth";
import { getNodes, connectToRemoteNode } from "../discovery";
import { db } from "../db";
import { nodeInfo } from "../node";
import type { NodeRecord } from "@shared/types";

export const nodeRouter = Router();
nodeRouter.use(authMiddleware);

// 列出所有已知节点
nodeRouter.get("/", (_req, res) => {
  res.json(getNodes());
});

// 手动添加节点（远程节点，非局域网 mDNS 发现）
const addSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  name: z.string().optional(),
});

nodeRouter.post("/", (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法" });
  const { host, port, name } = parsed.data;
  const id = name ? `node-${name}-${Date.now().toString(36)}` : `node-${host.replace(/\./g, "")}-${port}`;
  connectToRemoteNode(host, port, id);
  res.json({ ok: true, nodeId: id, message: "正在连接节点..." });
});

// 删除节点
nodeRouter.delete("/:id", (req, res) => {
  const { id } = req.params;
  if (id === nodeInfo.id) return res.status(400).json({ error: "不能删除当前节点" });
  db.prepare("DELETE FROM nodes WHERE id = ?").run(id);
  res.json({ ok: true });
});

// 当前节点信息
nodeRouter.get("/self", (_req, res) => {
  res.json({
    ...nodeInfo,
    online: true,
    isSelf: true,
  } as NodeRecord);
});
