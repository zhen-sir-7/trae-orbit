import type { AgentKind, AgentStatus, DeviceType, RiskLevel, TaskStatus, TaskType } from "@/types";

export const statusMeta: Record<
  TaskStatus,
  { label: string; dot: string; text: string; bar: string }
> = {
  pending: {
    label: "待执行",
    dot: "bg-ink-mute",
    text: "text-ink-mute",
    bar: "bg-ink-mute",
  },
  running: {
    label: "执行中",
    dot: "bg-moss",
    text: "text-moss",
    bar: "bg-moss",
  },
  waiting: {
    label: "等待确认",
    dot: "bg-amber",
    text: "text-amber",
    bar: "bg-amber",
  },
  completed: {
    label: "已完成",
    dot: "bg-ink",
    text: "text-ink",
    bar: "bg-ink",
  },
  failed: {
    label: "失败",
    dot: "bg-brick",
    text: "text-brick",
    bar: "bg-brick",
  },
};

export const riskMeta: Record<
  RiskLevel,
  { label: string; chip: string; ring: string }
> = {
  low: {
    label: "低风险",
    chip: "bg-sand-200 text-ink-soft border-ink/30",
    ring: "border-l-moss",
  },
  medium: {
    label: "中风险",
    chip: "bg-amber/15 text-amber border-amber/40",
    ring: "border-l-amber",
  },
  high: {
    label: "高风险",
    chip: "bg-brick/15 text-brick border-brick/40",
    ring: "border-l-brick",
  },
  critical: {
    label: "极高风险",
    chip: "bg-brick text-sand-50 border-brick",
    ring: "border-l-brick",
  },
};

export const deviceTypeMeta: Record<
  DeviceType,
  { label: string; abbr: string }
> = {
  phone: { label: "手机", abbr: "PH" },
  "office-pc": { label: "办公电脑", abbr: "OP" },
  "home-pc": { label: "家用电脑", abbr: "HP" },
  cloud: { label: "云端", abbr: "CL" },
  nas: { label: "NAS", abbr: "NS" },
};

export const taskTypeMeta: Record<TaskType, { label: string; defaultRisk: RiskLevel }> = {
  qa: { label: "问答 / 摘要", defaultRisk: "low" },
  "file-analysis": { label: "文件分析", defaultRisk: "medium" },
  code: { label: "代码任务", defaultRisk: "medium" },
  bulk: { label: "批量处理", defaultRisk: "medium" },
  "browser-auth": { label: "浏览器登录态", defaultRisk: "high" },
  "high-risk": { label: "高风险操作", defaultRisk: "critical" },
};

export function formatTimeRange(from: string, to: string): string {
  return `${from} → ${to}`;
}

// Agent kind → 显示色（按 kind 索引，兼容内置与自定义）
export const agentKindMeta: Record<AgentKind, { label: string; color: string }> = {
  trae: { label: "TRAE", color: "#B85C38" },
  "claude-code": { label: "Claude Code", color: "#C8893B" },
  opencode: { label: "opencode", color: "#5C6B4A" },
  codex: { label: "Codex CLI", color: "#3A3A38" },
  custom: { label: "Custom", color: "#6B6B66" },
};

export const agentStatusMeta: Record<
  AgentStatus,
  { label: string; dot: string; text: string }
> = {
  idle: { label: "空闲", dot: "bg-ink-mute", text: "text-ink-mute" },
  busy: { label: "执行中", dot: "bg-moss", text: "text-moss" },
  error: { label: "异常", dot: "bg-brick", text: "text-brick" },
  offline: { label: "未连接", dot: "bg-ink-mute/40", text: "text-ink-mute" },
};

export const logLevelMeta: Record<
  "info" | "success" | "warn" | "error",
  { label: string; text: string; tag: string }
> = {
  info: { label: "INFO", text: "text-ink-soft", tag: "bg-sand-300 text-ink" },
  success: { label: "DONE", text: "text-moss", tag: "bg-moss/20 text-moss" },
  warn: { label: "WARN", text: "text-amber", tag: "bg-amber/20 text-amber" },
  error: { label: "ERR", text: "text-brick", tag: "bg-brick/20 text-brick" },
};
