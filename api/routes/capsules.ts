import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { db } from "../db";
import { authMiddleware } from "./auth";
import { rowToDevice } from "./devices";
import { scheduleTask } from "../engine/scheduler";
import { runAgent } from "../agents/runner";
import { broadcast } from "../ws";
import { recordOp, syncRow } from "../sync";
import { nodeInfo } from "../node";
import type {
  CapsuleContext,
  DeviceType,
  RiskLevel,
  TaskCapsule,
  TaskStatus,
  TaskType,
} from "@shared/types";

export const capsuleRouter = Router();
capsuleRouter.use(authMiddleware);

const createSchema = z.object({
  goal: z.string().min(1),
  taskType: z.enum(["qa", "file-analysis", "code", "bulk", "browser-auth", "high-risk"]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  context: z.object({}).default({}),
  needsLocalFiles: z.boolean().default(false),
  needsBrowserAuth: z.boolean().default(false),
  fileSizeMB: z.number().default(50),
  originDeviceId: z.string().optional(),
  originDeviceType: z.enum(["phone", "office-pc", "home-pc", "cloud", "nas"]).default("phone"),
});

function nowTs() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}
function nowIso() {
  return new Date().toISOString();
}

function rowToCapsule(row: any): TaskCapsule {
  const timeline = db
    .prepare("SELECT * FROM timeline_events WHERE capsule_id = ? ORDER BY ts ASC")
    .all(row.id)
    .map((t: any) => ({
      id: t.id,
      capsuleId: t.capsule_id,
      ts: t.ts,
      title: t.title,
      detail: t.detail,
      device: t.device ?? undefined,
      kind: t.kind,
    }));
  const relays = db
    .prepare("SELECT * FROM relay_hops WHERE capsule_id = ? ORDER BY ts ASC")
    .all(row.id)
    .map((r: any) => ({
      id: r.id,
      capsuleId: r.capsule_id,
      fromDevice: r.from_device,
      toDevice: r.to_device,
      ts: r.ts,
      reason: r.reason,
    }));
  const logs = db
    .prepare("SELECT * FROM log_lines WHERE capsule_id = ? ORDER BY ts ASC")
    .all(row.id)
    .map((l: any) => ({
      id: l.id,
      capsuleId: l.capsule_id,
      ts: l.ts,
      level: l.level,
      text: l.text,
      agentId: l.agent_id ?? undefined,
    }));
  return {
    id: row.id,
    userId: row.user_id,
    goal: row.goal,
    context: JSON.parse(row.context || "{}"),
    status: row.status as TaskStatus,
    executionLocation: row.execution_location as DeviceType,
    executionDeviceId: row.execution_device_id ?? undefined,
    riskLevel: row.risk_level as RiskLevel,
    taskType: row.task_type as TaskType,
    progress: row.progress,
    schedulingReason: row.scheduling_reason,
    permissions: JSON.parse(row.permissions || "[]"),
    intermediateResults: JSON.parse(row.intermediate_results || "[]"),
    nextAction: row.next_action,
    originDevice: row.origin_device as DeviceType,
    originDeviceId: row.origin_device_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeline,
    relays,
    logs,
  };
}

// 列表
capsuleRouter.get("/", (req, res) => {
  const userId = (req as any).userId as string;
  const rows = db
    .prepare("SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId);
  res.json(rows.map(rowToCapsule));
});

// 详情
capsuleRouter.get("/:id", (req, res) => {
  const userId = (req as any).userId as string;
  const row = db
    .prepare("SELECT * FROM capsules WHERE id = ? AND user_id = ?")
    .get(req.params.id, userId);
  if (!row) return res.status(404).json({ error: "胶囊不存在" });
  res.json(rowToCapsule(row));
});

// 创建（触发调度）
capsuleRouter.post("/", (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法" });
  const d = parsed.data;

  // 取用户在线设备
  const deviceRows = db
    .prepare("SELECT * FROM devices WHERE user_id = ? AND online = 1")
    .all(userId)
    .map(rowToDevice);
  // 若无在线设备，补充一个云端占位（保证流程可走通）
  const devices = deviceRows.length
    ? deviceRows
    : [
        {
          id: "cloud-fallback",
          userId,
          name: "Orbit Cloud",
          type: "cloud" as DeviceType,
          online: true,
          capabilities: ["高算力"],
          load: 30,
          lastSeen: nowIso(),
        },
      ];

  const result = scheduleTask(
    {
      taskType: d.taskType,
      fileSizeMB: d.fileSizeMB,
      needsLocalFiles: d.needsLocalFiles,
      needsBrowserAuth: d.needsBrowserAuth,
      riskLevel: d.riskLevel,
    },
    devices
  );

  const id = `cap-${nanoid(6)}`;
  const now = nowIso();
  const ts = nowTs();
  const execDevice = result.recommendedDevice;
  const needsApproval = d.riskLevel === "high" || d.riskLevel === "critical";
  const status: TaskStatus = needsApproval ? "waiting" : "pending";

  db.prepare(
    `INSERT INTO capsules (
      id, user_id, goal, context, status, execution_location, execution_device_id,
      risk_level, task_type, progress, scheduling_reason, permissions,
      intermediate_results, next_action, origin_device, origin_device_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, userId, d.goal, JSON.stringify(d.context), status,
    result.recommendedDeviceType, execDevice?.id ?? null,
    d.riskLevel, d.taskType, result.reason,
    JSON.stringify(buildPermissions(d.taskType, d.riskLevel)),
    JSON.stringify([]),
    needsApproval ? "等待用户审批" : "待执行",
    d.originDeviceType, d.originDeviceId ?? null, now, now
  );
  syncRow("capsules", id);

  // 时间线：创建 + 调度
  const evCreateId = `ev-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(evCreateId, id, ts, "任务胶囊创建", "用户发起任务", d.originDeviceType, "create");
  syncRow("timeline_events", evCreateId);

  const evSchedId = `ev-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(evSchedId, id, ts, "调度评估", result.reason, result.recommendedDeviceType, "schedule");
  syncRow("timeline_events", evSchedId);

  // 跨端接力记录（若执行端与发起端不同）
  if (result.recommendedDeviceType !== d.originDeviceType) {
    const relayId = `relay-${nanoid(8)}`;
    db.prepare(
      `INSERT INTO relay_hops (id, capsule_id, from_device, to_device, ts, reason) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(relayId, id, d.originDeviceType, result.recommendedDeviceType, ts, result.reason);
    const evRelayId = `ev-${nanoid(8)}`;
    db.prepare(
      `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(evRelayId, id, ts, `跨端接力 · ${deviceTypeLabel(d.originDeviceType)} → ${deviceTypeLabel(result.recommendedDeviceType)}`, "任务上下文已同步到执行端", result.recommendedDeviceType, "relay");
    syncRow("timeline_events", evRelayId);
  }

  // 高风险 → 创建审批请求
  if (needsApproval) {
    const approvalId = `appr-${nanoid(8)}`;
    db.prepare(
      `INSERT INTO approvals (id, capsule_id, risk_level, operations, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(approvalId, id, d.riskLevel, JSON.stringify(buildPermissions(d.taskType, d.riskLevel)), now);
    syncRow("approvals", approvalId);
    broadcast(userId, {
      type: "approval:request",
      approval: {
        id: approvalId,
        capsuleId: id,
        riskLevel: d.riskLevel,
        operations: buildPermissions(d.taskType, d.riskLevel),
        status: "pending",
        createdAt: now,
      },
    });
  }

  broadcast(userId, { type: "capsule:update", capsuleId: id });
  const row = db.prepare("SELECT * FROM capsules WHERE id = ?").get(id);
  res.json(rowToCapsule(row));
});

// 审批（任一设备可操作）
capsuleRouter.post("/:id/approve", (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { approved, resolvedBy } = req.body as { approved: boolean; resolvedBy?: string };
  const row = db.prepare("SELECT * FROM capsules WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) return res.status(404).json({ error: "胶囊不存在" });

  const now = nowIso();
  const ts = nowTs();
  db.prepare("UPDATE approvals SET status = ?, resolved_by = ?, resolved_at = ? WHERE capsule_id = ? AND status = 'pending'")
    .run(approved ? "approved" : "rejected", resolvedBy ?? "user", now, id);
  // 同步审批记录
  const apprRow = db.prepare("SELECT * FROM approvals WHERE capsule_id = ? ORDER BY resolved_at DESC LIMIT 1").get(id) as any;
  if (apprRow) syncRow("approvals", apprRow.id);

  if (approved) {
    db.prepare("UPDATE capsules SET status = 'running', progress = ?, next_action = '已确认，继续执行', updated_at = ? WHERE id = ?")
      .run(Math.max((row as any).progress, 80), now, id);
    const evApprId = `ev-${nanoid(8)}`;
    db.prepare(
      `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(evApprId, id, ts, "用户已确认", "审批通过，任务继续执行", "phone", "approval");
    syncRow("timeline_events", evApprId);
  } else {
    db.prepare("UPDATE capsules SET status = 'failed', next_action = '用户拒绝执行', updated_at = ? WHERE id = ?").run(now, id);
  }
  syncRow("capsules", id);

  broadcast(userId, { type: "approval:result", capsuleId: id, approved });
  broadcast(userId, { type: "capsule:update", capsuleId: id });
  const updated = db.prepare("SELECT * FROM capsules WHERE id = ?").get(id);
  res.json(rowToCapsule(updated));
});

// 触发本机 Agent 执行（联邦式：任意节点可认领执行）
capsuleRouter.post("/:id/execute", (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { agentId, workdir } = req.body as { agentId: string; workdir?: string };
  const capRow = db.prepare("SELECT * FROM capsules WHERE id = ? AND user_id = ?").get(id, userId);
  if (!capRow) return res.status(404).json({ error: "胶囊不存在" });

  // 任务认领：原子操作，防止多节点重复执行
  const claimResult = db
    .prepare("UPDATE capsules SET claimed_by = ?, updated_at = ? WHERE id = ? AND (claimed_by IS NULL OR claimed_by = ?)")
    .run(nodeInfo.id, new Date().toISOString(), id, nodeInfo.id);
  if (claimResult.changes === 0) {
    const claimedBy = (capRow as any).claimed_by;
    if (claimedBy && claimedBy !== nodeInfo.id) {
      return res.status(409).json({ error: `任务已被节点 ${claimedBy} 认领` });
    }
  }
  syncRow("capsules", id);

  // Agent：优先用户自定义，否则系统内置
  let agentRow = db.prepare("SELECT * FROM agents WHERE id = ? AND user_id = ?").get(agentId, userId) as any;
  if (!agentRow) {
    agentRow = db.prepare("SELECT * FROM agents WHERE id = ? AND user_id = 'system'").get(agentId) as any;
  }
  if (!agentRow || !agentRow.connected) {
    return res.status(400).json({ error: "Agent 未连接" });
  }

  const agent = {
    id: agentRow.id,
    userId: agentRow.user_id,
    name: agentRow.name,
    abbr: agentRow.abbr,
    kind: agentRow.kind,
    command: agentRow.command,
    args: agentRow.args ?? undefined,
    workdir: agentRow.workdir ?? undefined,
    connected: !!agentRow.connected,
    status: agentRow.status,
    currentTaskId: agentRow.current_task_id ?? undefined,
    capabilities: JSON.parse(agentRow.capabilities || "[]"),
    version: agentRow.version,
    builtIn: !!agentRow.built_in,
  };

  runAgent({
    agent,
    capsuleId: id,
    userId,
    goal: (capRow as any).goal,
    workdir,
  });
  res.json({ ok: true, message: "Agent 已启动", nodeId: nodeInfo.id });
});

function buildPermissions(taskType: TaskType, riskLevel: RiskLevel): string[] {
  const base: Record<TaskType, string[]> = {
    qa: ["生成文本摘要"],
    "file-analysis": ["读取文件", "生成分析报告"],
    code: ["读取项目文件", "修改代码", "运行构建"],
    bulk: ["读取文件", "批量处理", "写入归档目录"],
    "browser-auth": ["访问浏览器登录态", "截图"],
    "high-risk": ["删除文件", "提交代码", "上传数据"],
  };
  const perms = [...base[taskType]];
  if (riskLevel === "high" || riskLevel === "critical") {
    perms.push("敏感操作需手机端审批");
  }
  return perms;
}

function deviceTypeLabel(t: DeviceType): string {
  return { phone: "手机", "office-pc": "办公电脑", "home-pc": "家用电脑", cloud: "云端", nas: "NAS" }[t];
}

// ============================================================
// 上下文包导入/导出 —— 打通不同工具的历史记录
// ============================================================

export interface ContextBundle {
  version: "1.0";
  exportedAt: string;
  source: {
    nodeId: string;
    nodeName: string;
    app: string;
  };
  capsules: ExportedCapsule[];
}

export interface ExportedCapsule {
  id: string;
  goal: string;
  context: Record<string, unknown>;
  status: string;
  progress: number;
  taskType: string;
  riskLevel: string;
  nextAction: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{
    id: string;
    ts: string;
    title: string;
    detail: string | null;
    device: string | null;
    kind: string;
  }>;
  logs: Array<{
    id: string;
    ts: string;
    level: string;
    text: string;
    agentId: string | null;
  }>;
  relays: Array<{
    id: string;
    fromDevice: string;
    toDevice: string;
    ts: string;
    reason: string;
  }>;
}

/** 导出胶囊为上下文包（JSON） */
capsuleRouter.get("/export", (req, res) => {
  const userId = (req as any).userId as string;
  const { ids } = req.query as { ids?: string };
  const idList = ids ? ids.split(",").filter(Boolean) : [];

  const rows = idList.length
    ? db.prepare(`SELECT * FROM capsules WHERE id IN (${idList.map(() => "?").join(",")}) AND user_id = ?`).all(...idList, userId)
    : db.prepare("SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC").all(userId);

  const capsules: ExportedCapsule[] = rows.map((row: any) => {
    const timeline = db
      .prepare("SELECT * FROM timeline_events WHERE capsule_id = ? ORDER BY ts ASC")
      .all(row.id)
      .map((t: any) => ({
        id: t.id,
        ts: t.ts,
        title: t.title,
        detail: t.detail ?? null,
        device: t.device ?? null,
        kind: t.kind,
      }));
    const logs = db
      .prepare("SELECT * FROM log_lines WHERE capsule_id = ? ORDER BY ts ASC")
      .all(row.id)
      .map((l: any) => ({
        id: l.id,
        ts: l.ts,
        level: l.level,
        text: l.text,
        agentId: l.agent_id ?? null,
      }));
    const relays = db
      .prepare("SELECT * FROM relay_hops WHERE capsule_id = ? ORDER BY ts ASC")
      .all(row.id)
      .map((r: any) => ({
        id: r.id,
        fromDevice: r.from_device,
        toDevice: r.to_device,
        ts: r.ts,
        reason: r.reason,
      }));
    return {
      id: row.id,
      goal: row.goal,
      context: JSON.parse(row.context || "{}"),
      status: row.status,
      progress: row.progress,
      taskType: row.task_type,
      riskLevel: row.risk_level,
      nextAction: row.next_action,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timeline,
      logs,
      relays,
    };
  });

  const bundle: ContextBundle = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    source: {
      nodeId: nodeInfo.id,
      nodeName: nodeInfo.name,
      app: "trae-orbit",
    },
    capsules,
  };
  res.setHeader("Content-Disposition", `attachment; filename="orbit-context-${Date.now()}.json"`);
  res.json(bundle);
});

/** 从上下文包导入胶囊 */
capsuleRouter.post("/import", (req, res) => {
  const userId = (req as any).userId as string;
  const bundle = req.body as ContextBundle;

  if (!bundle || !Array.isArray(bundle.capsules)) {
    return res.status(400).json({ error: "无效的上下文包格式" });
  }

  const now = nowIso();
  const ts = nowTs();
  const imported: string[] = [];

  const insertCapsule = db.prepare(
    `INSERT INTO capsules (id, user_id, goal, context, status, progress, risk_level, task_type, next_action, origin_device, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertEvent = db.prepare(
    `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertLog = db.prepare(
    `INSERT INTO log_lines (id, capsule_id, ts, level, text, agent_id) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertRelay = db.prepare(
    `INSERT INTO relay_hops (id, capsule_id, from_device, to_device, ts, reason) VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const cap of bundle.capsules) {
    const newId = `cap-import-${nanoid(6)}`;
    const originDevice = (cap as any).originDevice || (cap as any).originDeviceType || "phone";

    insertCapsule.run(
      newId, userId,
      `[导入] ${cap.goal}`.slice(0, 500),
      JSON.stringify({ ...cap.context, _importedFrom: bundle.source.app, _originalId: cap.id }),
      "completed", cap.progress ?? 100,
      cap.riskLevel ?? "low", cap.taskType ?? "qa",
      cap.nextAction ? `[导入] ${cap.nextAction}` : "从其他工具导入的任务",
      originDevice, now, now
    );
    recordOp("upsert", "capsules", newId, { id: newId, user_id: userId });

    // 导入时间线
    const evImportId = `ev-${nanoid(8)}`;
    insertEvent.run(evImportId, newId, ts, "从外部导入", `来源: ${bundle.source.app} · 原始ID: ${cap.id}`, originDevice, "create");
    recordOp("upsert", "timeline_events", evImportId, { id: evImportId, capsule_id: newId });

    for (const ev of (cap.timeline ?? [])) {
      const evId = `ev-${nanoid(8)}`;
      insertEvent.run(evId, newId, ev.ts, `[导入] ${ev.title}`, ev.detail, ev.device, ev.kind);
      recordOp("upsert", "timeline_events", evId, { id: evId, capsule_id: newId });
    }

    // 导入日志（前50条，防止数据过大）
    for (const log of (cap.logs ?? []).slice(0, 50)) {
      const logId = `log-${nanoid(8)}`;
      insertLog.run(logId, newId, log.ts, log.level, `[导入] ${log.text}`, log.agentId);
      recordOp("upsert", "log_lines", logId, { id: logId, capsule_id: newId });
    }

    // 导入 relay 记录
    for (const relay of (cap.relays ?? [])) {
      const relayId = `relay-${nanoid(8)}`;
      insertRelay.run(relayId, newId, relay.fromDevice, relay.toDevice, relay.ts, relay.reason);
      recordOp("upsert", "relay_hops", relayId, { id: relayId, capsule_id: newId });
    }

    imported.push(newId);
  }

  broadcast(userId, { type: "capsules:imported", ids: imported });
  res.json({ ok: true, imported: imported.length, ids: imported });
});

/** 从 OpenCode workspace 导入（读取 IDENTITY.md / SKILLS.md / SOUL.md） */
capsuleRouter.post("/import-opencode", async (req, res) => {
  const userId = (req as any).userId as string;
  const { opencodePath } = req.body as { opencodePath?: string };
  const now = nowIso();
  const ts = nowTs();

  const workspaceDir = opencodePath
    ? path.join(opencodePath, "workspace")
    : path.join(os.homedir(), ".opencode", "workspace");

  const files = await readFilesFromDir(workspaceDir);

  const identity = files["IDENTITY.md"] ?? "";
  const skills = files["SKILLS.md"] ?? "";
  const soul = files["SOUL.md"] ?? "";

  if (!identity && !skills && !soul) {
    return res.status(404).json({ error: `OpenCode workspace 不存在或为空: ${workspaceDir}` });
  }

  const goal = extractGoal(identity, skills, soul) ?? "从 OpenCode 导入的上下文";

  const capsuleId = `cap-oc-${nanoid(6)}`;
  const context = {
    source: "opencode",
    workspacePath: workspaceDir,
    identity,
    skills,
    soul,
    files: Object.keys(files).filter((f) => f !== "IDENTITY.md" && f !== "SKILLS.md" && f !== "SOUL.md"),
  };

  db.prepare(
    `INSERT INTO capsules (id, user_id, goal, context, status, progress, risk_level, task_type, next_action, origin_device, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'completed', 100, 'low', 'qa', '已从 OpenCode 导入上下文', 'phone', ?, ?)`
  ).run(capsuleId, userId, goal, JSON.stringify(context), now, now);
  recordOp("upsert", "capsules", capsuleId, { id: capsuleId, user_id: userId });

  const evId = `ev-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(evId, capsuleId, ts, "从 OpenCode 导入", `工作区: ${workspaceDir}`, "phone", "create");
  recordOp("upsert", "timeline_events", evId, { id: evId, capsule_id: capsuleId });

  broadcast(userId, { type: "capsule:update", capsuleId });
  const row = db.prepare("SELECT * FROM capsules WHERE id = ?").get(capsuleId);
  res.json({ ok: true, capsule: rowToCapsule(row) });
});

// 辅助：读取目录下所有 .md/.txt 文件
async function readFilesFromDir(dir: string): Promise<Record<string, string>> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const result: Record<string, string> = {};
    for (const entry of entries) {
      if (entry.isFile() && /\.(md|txt|json)$/i.test(entry.name)) {
        const content = await readFile(path.join(dir, entry.name), "utf-8");
        result[entry.name] = content;
      }
    }
    return result;
  } catch {
    return {};
  }
}

// 辅助：从内容中提取任务描述
function extractGoal(identity: string, skills: string, soul: string): string | null {
  const lines = [...identity.split("\n"), ...skills.split("\n"), ...soul.split("\n")];
  for (const line of lines) {
    const m = line.match(/^(?:#+\s*)?([^#\n]{10,80})/);
    if (m) return m[1].trim();
  }
  return null;
}
