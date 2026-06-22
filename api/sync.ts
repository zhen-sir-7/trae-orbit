// 操作日志同步协议：所有写操作记录到 op_log，跨节点同步
// 联邦式 CDC（Change Data Capture）—— 每个节点都是对等的

import { db } from "./db";
import { nodeInfo } from "./node";
import { nanoid } from "nanoid";
import type { OpLogEntry } from "@shared/types";

// 实体 → 表名映射
const entityTable: Record<string, string> = {
  users: "users",
  capsules: "capsules",
  timeline_events: "timeline_events",
  log_lines: "log_lines",
  approvals: "approvals",
  devices: "devices",
  agents: "agents",
};

// 记录操作到 op_log（本地写操作时调用）
export function recordOp(
  op: "upsert" | "delete",
  entity: string,
  recordId: string,
  payload: object
): OpLogEntry {
  const id = `op-${nanoid(12)}`;
  const ts = new Date().toISOString();
  const payloadStr = JSON.stringify(payload);
  db.prepare(
    `INSERT INTO op_log (id, node_id, ts, op, entity, record_id, payload, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(id, nodeInfo.id, ts, op, entity, recordId, payloadStr);
  return { id, nodeId: nodeInfo.id, ts, op, entity, recordId, payload: payloadStr };
}

// 获取未同步的操作
export function getUnsyncedOps(): OpLogEntry[] {
  const rows = db.prepare(`SELECT * FROM op_log WHERE synced = 0 ORDER BY ts ASC`).all() as any[];
  return rows.map((r) => ({
    id: r.id,
    nodeId: r.node_id,
    ts: r.ts,
    op: r.op,
    entity: r.entity,
    recordId: r.record_id,
    payload: r.payload,
  }));
}

// 标记已同步
export function markSynced(opIds: string[]) {
  if (!opIds.length) return;
  const placeholders = opIds.map(() => "?").join(",");
  db.prepare(`UPDATE op_log SET synced = 1 WHERE id IN (${placeholders})`).run(...opIds);
}

// 应用远程操作到本地
export function applyRemoteOp(op: OpLogEntry): boolean {
  const table = entityTable[op.entity];
  if (!table) return false;

  if (op.op === "delete") {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(op.recordId);
    return true;
  }

  // upsert：payload 是完整行对象（key = 数据库列名）
  const payload = JSON.parse(op.payload);

  // Agent 表特殊处理：保留本地连接状态（connected/status/current_task_id 是本地状态）
  if (op.entity === "agents") {
    const local = db.prepare("SELECT connected, status, current_task_id FROM agents WHERE id = ?").get(op.recordId) as any;
    if (local) {
      payload.connected = local.connected;
      payload.status = local.status;
      payload.current_task_id = local.current_task_id;
    }
  }

  const cols = Object.keys(payload);
  if (cols.length === 0) return false;
  const colNames = cols.join(",");
  const placeholders = cols.map(() => "?").join(",");
  const updateSet = cols.filter((c) => c !== "id").map((c) => `${c}=excluded.${c}`).join(",");

  try {
    db.prepare(
      `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateSet}`
    ).run(...cols.map((c) => payload[c]));
    return true;
  } catch (err) {
    console.error(`[sync] 应用操作失败 ${op.entity}:${op.recordId}`, (err as Error).message);
    return false;
  }
}

// 批量应用远程操作（跳过自己产生的）
export function applyRemoteOps(ops: OpLogEntry[]): number {
  let applied = 0;
  for (const op of ops) {
    if (op.nodeId === nodeInfo.id) continue;
    if (applyRemoteOp(op)) applied++;
  }
  return applied;
}

// 读取一行记录为 payload（用于同步）
export function rowToPayload(entity: string, row: any): object {
  return { ...row };
}

// 辅助：读取完整行并记录到同步日志
export function syncRow(entity: string, id: string) {
  const table = entityTable[entity];
  if (!table) return;
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (row) recordOp("upsert", entity, id, row as object);
}
