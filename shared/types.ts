// 前后端共享类型定义

export type DeviceType = "phone" | "office-pc" | "home-pc" | "cloud" | "nas";

export type TaskStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type TaskType =
  | "qa"
  | "file-analysis"
  | "code"
  | "bulk"
  | "browser-auth"
  | "high-risk";

export type AgentKind = "claude-code" | "opencode" | "codex" | "trae" | "custom";

export type AgentStatus = "idle" | "busy" | "error" | "offline";

export interface DeviceRecord {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  online: boolean;
  capabilities: string[];
  load: number;
  battery?: number;
  network?: "wifi" | "cellular" | "ethernet";
  lastSeen: string;
}

export interface TimelineEvent {
  id: string;
  capsuleId: string;
  ts: string;
  title: string;
  detail: string;
  device?: DeviceType;
  kind:
    | "create"
    | "schedule"
    | "relay"
    | "progress"
    | "approval"
    | "complete"
    | "fail";
}

export interface RelayHop {
  id: string;
  capsuleId: string;
  fromDevice: DeviceType;
  toDevice: DeviceType;
  ts: string;
  reason: string;
}

export interface LogLine {
  id: string;
  capsuleId: string;
  ts: string;
  level: "info" | "success" | "warn" | "error";
  text: string;
  agentId?: string;
}

export interface CapsuleContext {
  files?: string[];
  conversation?: string;
  codePath?: string;
  history?: string[];
}

export interface TaskCapsule {
  id: string;
  userId: string;
  goal: string;
  context: CapsuleContext;
  status: TaskStatus;
  executionLocation: DeviceType;
  executionDeviceId?: string;
  riskLevel: RiskLevel;
  taskType: TaskType;
  progress: number;
  schedulingReason: string;
  permissions: string[];
  intermediateResults: string[];
  nextAction: string;
  originDevice: DeviceType;
  originDeviceId?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  relays: RelayHop[];
  logs: LogLine[];
}

export interface AgentRecord {
  id: string;
  userId: string;
  name: string;
  abbr: string;
  kind: AgentKind;
  command: string; // 命令模板，{goal} 占位符替换任务目标
  args?: string;
  workdir?: string;
  connected: boolean;
  status: AgentStatus;
  currentTaskId?: string;
  capabilities: string[];
  version: string;
  builtIn: boolean;
}

export interface Approval {
  id: string;
  capsuleId: string;
  riskLevel: RiskLevel;
  operations: string[];
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface SchedulingInput {
  taskType: TaskType;
  fileSizeMB?: number;
  needsLocalFiles?: boolean;
  needsBrowserAuth?: boolean;
  riskLevel: RiskLevel;
}

export interface SchedulingResult {
  recommendedDeviceType: DeviceType;
  recommendedDevice?: DeviceRecord;
  reason: string;
  alternatives: DeviceRecord[];
  notRecommended: { device: DeviceRecord; reason: string }[];
}

// API 响应
// （去除登录系统，不再需要 UserSession）

// 联邦节点记录
export interface NodeRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  online: boolean;
  lastSeen?: string;
  isSelf: boolean;  // 是否为当前节点
}

// 操作日志条目（跨节点同步用）
export interface OpLogEntry {
  id: string;
  nodeId: string;
  ts: string;
  op: "upsert" | "delete";
  entity: string;
  recordId: string;
  payload: string;
}

// 节点间同步消息（扩展 WSMessage）
export type NodeMessage =
  | { type: "node:hello"; node: NodeRecord }
  | { type: "node:welcome"; node: NodeRecord; knownNodes: NodeRecord[] }
  | { type: "node:sync"; ops: OpLogEntry[] }       // 操作日志批量同步
  | { type: "node:claim"; capsuleId: string; nodeId: string }  // 任务认领
  | { type: "node:heartbeat" };

// WebSocket 消息（客户端 + 节点间）
export type WSMessage =
  | { type: "capsule:update"; capsuleId: string }
  | { type: "capsules:imported"; ids: string[] }  // 导入完成通知
  | { type: "log:append"; log: LogLine }
  | { type: "approval:request"; approval: Approval }
  | { type: "approval:result"; capsuleId: string; approved: boolean }
  | { type: "device:status"; deviceId: string; online: boolean }
  | { type: "node:list"; nodes: NodeRecord[] }
  | { type: "heartbeat" }
  | { type: "subscribe"; userId: string };
