import { spawn } from "node:child_process";
import { nanoid } from "nanoid";
import type { AgentRecord, LogLine } from "@shared/types";
import { db } from "../db";
import { broadcast } from "../ws";
import { syncRow } from "../sync";

function nowTs() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function appendLog(capsuleId: string, userId: string, line: Omit<LogLine, "id" | "capsuleId" | "ts"> & { ts?: string }) {
  const log: LogLine = {
    id: `log-${nanoid(8)}`,
    capsuleId,
    ts: line.ts ?? nowTs(),
    ...line,
  };
  db.prepare(
    `INSERT INTO log_lines (id, capsule_id, ts, level, text, agent_id) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(log.id, capsuleId, log.ts, log.level, log.text, log.agentId ?? null);
  syncRow("log_lines", log.id);
  broadcast(userId, { type: "log:append", log });
  return log;
}

// 解析命令模板，替换 {goal} 占位符
function buildCommand(agent: AgentRecord, goal: string): { cmd: string; args: string[] } {
  const safeGoal = goal.replace(/"/g, '\\"');
  const cmd = agent.command;
  const argsStr = (agent.args ?? "").replace(/\{goal\}/g, safeGoal);
  // 按空格切分参数（简易实现）
  const args = argsStr ? argsStr.split(/\s+/).filter(Boolean) : [];
  return { cmd, args };
}

export interface RunOptions {
  agent: AgentRecord;
  capsuleId: string;
  userId: string;
  goal: string;
  workdir?: string;
}

// 执行 Agent，流式输出日志，更新胶囊进度，完成后回传结果
export function runAgent(opts: RunOptions) {
  const { agent, capsuleId, userId, goal, workdir } = opts;

  // 标记 Agent 忙碌
  db.prepare(
    `UPDATE agents SET status = 'busy', current_task_id = ? WHERE id = ?`
  ).run(capsuleId, agent.id);

  // 标记胶囊执行中
  db.prepare(
    `UPDATE capsules SET status = 'running', progress = 10, updated_at = ? WHERE id = ?`
  ).run(nowTs(), capsuleId);
  syncRow("capsules", capsuleId);
  broadcast(userId, { type: "capsule:update", capsuleId });

  appendLog(capsuleId, userId, {
    level: "info",
    text: `[${agent.name}] 启动执行：${goal}`,
    agentId: agent.id,
  });

  const { cmd, args } = buildCommand(agent, goal);
  const cwd = workdir || agent.workdir || process.cwd();

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env },
    });
  } catch (err) {
    appendLog(capsuleId, userId, {
      level: "error",
      text: `[${agent.name}] 启动失败：${(err as Error).message}`,
      agentId: agent.id,
    });
    failCapsule(capsuleId, userId, agent, "Agent 启动失败");
    return;
  }

  let stdoutBuf = "";
  let progress = 10;

  child.stdout?.on("data", (chunk: Buffer) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split("\n");
    stdoutBuf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      appendLog(capsuleId, userId, {
        level: "info",
        text: trimmed,
        agentId: agent.id,
      });
      // 简易进度推进
      progress = Math.min(progress + 4, 85);
      db.prepare(`UPDATE capsules SET progress = ?, updated_at = ? WHERE id = ?`).run(
        progress,
        nowTs(),
        capsuleId
      );
      syncRow("capsules", capsuleId);
      broadcast(userId, { type: "capsule:update", capsuleId });
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (!text) return;
    appendLog(capsuleId, userId, {
      level: "warn",
      text,
      agentId: agent.id,
    });
  });

  child.on("error", (err) => {
    appendLog(capsuleId, userId, {
      level: "error",
      text: `[${agent.name}] 执行异常：${err.message}`,
      agentId: agent.id,
    });
    failCapsule(capsuleId, userId, agent, "执行异常");
  });

  child.on("close", (code) => {
    if (code === 0) {
      appendLog(capsuleId, userId, {
        level: "success",
        text: `[${agent.name}] 执行完成（退出码 0）`,
        agentId: agent.id,
      });
      db.prepare(
        `UPDATE capsules SET status = 'completed', progress = 100, next_action = '任务已完成，可继续追问或结束', updated_at = ? WHERE id = ?`
      ).run(nowTs(), capsuleId);
      syncRow("capsules", capsuleId);
      const evCompleteId = `ev-${nanoid(8)}`;
      db.prepare(
        `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(evCompleteId, capsuleId, nowTs(), "任务完成", `${agent.name} 执行完成`, null, "complete");
      syncRow("timeline_events", evCompleteId);
    } else {
      appendLog(capsuleId, userId, {
        level: "error",
        text: `[${agent.name}] 执行结束，退出码 ${code}`,
        agentId: agent.id,
      });
      failCapsule(capsuleId, userId, agent, `退出码 ${code}`);
    }
    // 释放 Agent
    db.prepare(
      `UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ?`
    ).run(agent.id);
    broadcast(userId, { type: "capsule:update", capsuleId });
  });
}

function failCapsule(
  capsuleId: string,
  userId: string,
  agent: AgentRecord,
  reason: string
) {
  db.prepare(
    `UPDATE capsules SET status = 'failed', next_action = ? WHERE id = ?`
  ).run(`执行失败：${reason}`, capsuleId);
  syncRow("capsules", capsuleId);
  const evFailId = `ev-${nanoid(8)}`;
  db.prepare(
    `INSERT INTO timeline_events (id, capsule_id, ts, title, detail, device, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(evFailId, capsuleId, nowTs(), "执行失败", `${agent.name} ${reason}`, null, "fail");
  syncRow("timeline_events", evFailId);
  db.prepare(
    `UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ?`
  ).run(agent.id);
  broadcast(userId, { type: "capsule:update", capsuleId });
}
