import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { nodeInfo } from "./node";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ? (isAbsolute(process.env.DATA_DIR) ? process.env.DATA_DIR : join(__dirname, "..", process.env.DATA_DIR)) : join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, "orbit.db");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// 辅助：检查列是否存在
function hasColumn(table: string, col: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === col);
}
function addColumnIfNotExists(table: string, col: string, def: string) {
  if (!hasColumn(table, col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}

// 建表
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  token TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  online INTEGER NOT NULL DEFAULT 0,
  capabilities TEXT NOT NULL DEFAULT '[]',
  load INTEGER NOT NULL DEFAULT 0,
  battery INTEGER,
  network TEXT,
  last_seen TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  abbr TEXT NOT NULL,
  kind TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT,
  workdir TEXT,
  connected INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'offline',
  current_task_id TEXT,
  capabilities TEXT NOT NULL DEFAULT '[]',
  version TEXT NOT NULL DEFAULT '',
  built_in INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  execution_location TEXT NOT NULL,
  execution_device_id TEXT,
  risk_level TEXT NOT NULL,
  task_type TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  scheduling_reason TEXT NOT NULL DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '[]',
  intermediate_results TEXT NOT NULL DEFAULT '[]',
  next_action TEXT NOT NULL DEFAULT '',
  origin_device TEXT NOT NULL,
  origin_device_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  device TEXT,
  kind TEXT NOT NULL,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relay_hops (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  from_device TEXT NOT NULL,
  to_device TEXT NOT NULL,
  ts TEXT NOT NULL,
  reason TEXT NOT NULL,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS log_lines (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  text TEXT NOT NULL,
  agent_id TEXT,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  operations TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

-- 联邦节点表：记录已知对等节点
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT,
  added_at TEXT NOT NULL
);

-- 操作日志表：用于跨节点同步（CDC）
CREATE TABLE IF NOT EXISTS op_log (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  op TEXT NOT NULL,           -- upsert | delete
  entity TEXT NOT NULL,       -- capsules | timeline_events | log_lines | approvals | devices | agents
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,      -- JSON 序列化的完整行
  synced INTEGER NOT NULL DEFAULT 0  -- 是否已广播给其他节点
);
`);

// 给关键表补充 node_id + version（去中心化同步用）
addColumnIfNotExists("capsules", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");
addColumnIfNotExists("capsules", "version", "INTEGER NOT NULL DEFAULT 1");
addColumnIfNotExists("capsules", "claimed_by", "TEXT");  // 认领该任务的节点 ID
addColumnIfNotExists("timeline_events", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");
addColumnIfNotExists("log_lines", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");
addColumnIfNotExists("approvals", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");
addColumnIfNotExists("devices", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");
addColumnIfNotExists("agents", "node_id", "TEXT NOT NULL DEFAULT '" + nodeInfo.id + "'");

// 确保本节点在 nodes 表中
db.prepare(
  `INSERT OR IGNORE INTO nodes (id, name, host, port, online, last_seen, added_at) VALUES (?, ?, ?, ?, 1, ?, ?)`
).run(nodeInfo.id, nodeInfo.name, nodeInfo.host, nodeInfo.port, new Date().toISOString(), new Date().toISOString());

// 写入默认 Agent 配置（全局共享，user_id = 'system'）
// 先确保 system 用户存在（满足外键约束）
const hasSystemUser = db.prepare("SELECT id FROM users WHERE id = 'system'").get();
if (!hasSystemUser) {
  db.prepare(
    "INSERT INTO users (id, username, password, token, created_at) VALUES ('system', 'system', '', 'system', ?)"
  ).run(new Date().toISOString());
}

// 默认本地用户（去除登录系统后，所有数据归属此用户）
const hasLocalUser = db.prepare("SELECT id FROM users WHERE id = 'u-local'").get();
if (!hasLocalUser) {
  db.prepare(
    "INSERT INTO users (id, username, password, token, created_at) VALUES ('u-local', 'local', '', 'local-token', ?)"
  ).run(new Date().toISOString());
}

const hasAgents = db.prepare("SELECT COUNT(*) as c FROM agents WHERE user_id = 'system'").get() as { c: number };
if (hasAgents.c === 0) {
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, user_id, name, abbr, kind, command, args, workdir, connected, status, capabilities, version, built_in)
    VALUES (?, 'system', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const defaults: Array<[string, string, string, string, string, string, string, string, string, string, string]> = [
    ["agent-cc", "Claude Code", "CC", "claude-code", "claude", "-p {goal}", "", "0", "offline", "[]", "v1.0"],
    ["agent-opencode", "opencode", "OC", "opencode", "opencode", "run {goal}", "", "0", "offline", "[]", "v0.5"],
    ["agent-codex", "Codex CLI", "CX", "codex", "codex", "{goal}", "", "0", "offline", "[]", "v0.1"],
    ["agent-trae", "TRAE", "TR", "trae", "trae", "{goal}", "", "0", "offline", "[]", "v0.9"],
  ];
  for (const d of defaults) {
    insertAgent.run(...d);
  }
}

export { db };
