import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db";
import { authMiddleware } from "./auth";
import { broadcast } from "../ws";
import { syncRow } from "../sync";
import type { AgentKind, AgentRecord, AgentStatus } from "@shared/types";

export const agentRouter = Router();
agentRouter.use(authMiddleware);

function rowToAgent(row: any): AgentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    abbr: row.abbr,
    kind: row.kind as AgentKind,
    command: row.command,
    args: row.args ?? undefined,
    workdir: row.workdir ?? undefined,
    connected: !!row.connected,
    status: row.status as AgentStatus,
    currentTaskId: row.current_task_id ?? undefined,
    capabilities: JSON.parse(row.capabilities || "[]"),
    version: row.version,
    builtIn: !!row.built_in,
  };
}

// 列出：系统内置 + 用户自定义
agentRouter.get("/", (req, res) => {
  const userId = (req as any).userId as string;
  const rows = db
    .prepare("SELECT * FROM agents WHERE user_id = 'system' OR user_id = ? ORDER BY built_in DESC, name ASC")
    .all(userId);
  res.json(rows.map(rowToAgent));
});

const createSchema = z.object({
  name: z.string().min(1),
  abbr: z.string().min(1).max(4),
  command: z.string().min(1),
  args: z.string().optional(),
  workdir: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  version: z.string().default("custom"),
});

// 新增自定义 Agent
agentRouter.post("/", (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法" });
  const d = parsed.data;
  const id = `agent-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO agents (id, user_id, name, abbr, kind, command, args, workdir, connected, status, capabilities, version, built_in)
     VALUES (?, ?, ?, ?, 'custom', ?, ?, ?, 0, 'offline', ?, ?, 0)`
  ).run(id, userId, d.name, d.abbr, d.command, d.args ?? null, d.workdir ?? null, JSON.stringify(d.capabilities), d.version);
  syncRow("agents", id);
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  res.json(rowToAgent(row));
});

// 更新（连接/断开、改名等）
agentRouter.patch("/:id", (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { connected, name, command, args, workdir } = req.body as {
    connected?: boolean;
    name?: string;
    command?: string;
    args?: string;
    workdir?: string;
  };

  // 仅可操作系统内置或自己的 Agent
  const row = db
    .prepare("SELECT * FROM agents WHERE id = ? AND (user_id = 'system' OR user_id = ?)")
    .get(id, userId) as any;
  if (!row) return res.status(404).json({ error: "Agent 不存在" });

  if (connected !== undefined) {
    db.prepare("UPDATE agents SET connected = ?, status = ? WHERE id = ?").run(
      connected ? 1 : 0,
      connected ? "idle" : "offline",
      id
    );
    // connected 是本地状态，不同步到其他节点
  }
  // 仅自定义 Agent 可改命令
  if (!row.built_in) {
    let defChanged = false;
    if (name) { db.prepare("UPDATE agents SET name = ? WHERE id = ?").run(name, id); defChanged = true; }
    if (command) { db.prepare("UPDATE agents SET command = ? WHERE id = ?").run(command, id); defChanged = true; }
    if (args !== undefined) { db.prepare("UPDATE agents SET args = ? WHERE id = ?").run(args, id); defChanged = true; }
    if (workdir !== undefined) { db.prepare("UPDATE agents SET workdir = ? WHERE id = ?").run(workdir, id); defChanged = true; }
    if (defChanged) syncRow("agents", id);
  }

  broadcast(userId, { type: "device:status", deviceId: id, online: !!connected });
  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  res.json(rowToAgent(updated));
});
