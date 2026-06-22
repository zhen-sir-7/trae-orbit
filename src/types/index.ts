// TRAE Orbit 前端类型定义（与 shared/types 对齐，便于直接消费 API 响应）

export type DeviceType = "phone" | "office-pc" | "home-pc" | "cloud" | "nas";

export type TaskStatus =
  | "pending" // 待执行
  | "running" // 执行中
  | "waiting" // 等待用户确认
  | "completed" // 已完成
  | "failed"; // 失败

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type TaskType =
  | "qa" // 简单问答/摘要
  | "file-analysis" // 本地文件分析
  | "code" // 代码修改/测试
  | "bulk" // 大文件/批量处理
  | "browser-auth" // 需浏览器登录态
  | "high-risk"; // 高风险操作

export type AgentKind =
  | "claude-code"
  | "opencode"
  | "codex"
  | "trae"
  | "custom";

export type AgentStatus = "idle" | "busy" | "error" | "offline";

export interface DeviceRecord {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  online: boolean;
  capabilities: string[];
  load: number; // 0-100
  battery?: number; // 0-100，仅手机
  network?: "wifi" | "cellular" | "ethernet";
  lastSeen: string;
}

// 兼容旧引用
export type DeviceProfile = DeviceRecord;

export interface TimelineEvent {
  id: string;
  capsuleId: string;
  ts: string; // 显示用字符串
  title: string;
  detail: string;
  device?: DeviceType;
  kind: "create" | "schedule" | "relay" | "progress" | "approval" | "complete" | "fail";
}

export interface RelayHop {
  id: string;
  capsuleId: string;
  fromDevice: DeviceType;
  toDevice: DeviceType;
  ts: string;
  reason: string;
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
  progress: number; // 0-100
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

// 兼容旧引用
export type Agent = AgentRecord;

export interface LogLine {
  id: string;
  capsuleId: string;
  ts: string;
  level: "info" | "success" | "warn" | "error";
  text: string;
  agentId?: string;
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

// 联邦节点记录
export interface NodeRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  online: boolean;
  lastSeen?: string;
  isSelf: boolean; // 是否为当前节点
}
