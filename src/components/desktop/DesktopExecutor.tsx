import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Terminal, Cpu, Activity, Shield, Play, Loader2 } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import { AgentPanel } from "./AgentPanel";
import {
  agentKindMeta,
  logLevelMeta,
  statusMeta,
  taskTypeMeta,
} from "@/lib/meta";
import type { AgentRecord, TaskCapsule } from "@/types";

export function DesktopExecutor() {
  const capsules = useOrbitStore((s) => s.capsules);
  const logs = useOrbitStore((s) => s.logs);
  const approve = useOrbitStore((s) => s.approveCapsule);
  const agents = useOrbitStore((s) => s.agents);

  // 电脑端执行的任务（执行位置为 office-pc / home-pc，或状态为 waiting）
  const localTasks = capsules.filter(
    (c) =>
      c.executionLocation === "office-pc" ||
      c.executionLocation === "home-pc" ||
      c.status === "waiting" ||
      c.status === "pending"
  );
  const waitingTasks = capsules.filter((c) => c.status === "waiting");
  const connectedAgents = agents.filter((a) => a.connected);

  return (
    <div className="flex h-full flex-col">
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between border-b border-ink bg-sand-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-ochre" strokeWidth={1.75} />
          <span className="font-display text-sm font-semibold text-ink">执行端 · 办公电脑</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="mono-label !text-moss">● 在线</span>
          <span className="mono-label">{connectedAgents.length} AGENTS</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 待审批横幅 */}
        {waitingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-amber/40 bg-amber/10 px-4 py-2.5"
          >
            <div className="flex items-center gap-2 text-amber">
              <Shield size={13} strokeWidth={2} />
              <span className="text-xs font-semibold">
                {waitingTasks.length} 个任务等待审批（电脑端可直接确认）
              </span>
            </div>
          </motion.div>
        )}

        {/* AI Agent 集成面板 */}
        <AgentPanel />

        {/* 执行中任务 */}
        <section className="border-b border-ink/15">
          <header className="flex items-center justify-between border-b border-ink/20 bg-sand-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-ochre" strokeWidth={1.75} />
              <span className="font-display text-sm font-semibold text-ink">本机执行任务</span>
            </div>
            <span className="mono-label !text-ink">{localTasks.length} TASKS</span>
          </header>
          <ul>
            {localTasks.map((c, i) => (
              <DesktopTaskRow
                key={c.id}
                capsule={c}
                index={i}
                connectedAgents={connectedAgents}
                onApprove={() => approve(c.id, true)}
                onReject={() => approve(c.id, false)}
              />
            ))}
            {localTasks.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-ink-mute">
                当前没有在本机执行的任务
              </li>
            )}
          </ul>
        </section>

        {/* 执行日志 */}
        <section>
          <header className="flex items-center justify-between border-b border-ink/20 bg-sand-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-ochre" strokeWidth={1.75} />
              <span className="font-display text-sm font-semibold text-ink">执行日志</span>
            </div>
            <span className="mono-label">LIVE</span>
          </header>
          <div className="bg-ink/95 px-3 py-3 font-mono text-[11px] leading-relaxed">
            {logs.length === 0 && (
              <div className="text-sand-400/40">暂无日志，发起任务后将实时显示执行输出…</div>
            )}
            {logs.map((log) => {
              const lv = logLevelMeta[log.level];
              const agent = log.agentId
                ? agents.find((a) => a.id === log.agentId)
                : null;
              const am = agent ? agentKindMeta[agent.kind] : null;
              return (
                <div key={log.id} className="flex items-start gap-2 py-0.5">
                  <span className="shrink-0 text-sand-400/60">{log.ts}</span>
                  {am && (
                    <span
                      className="shrink-0 font-semibold"
                      style={{ color: am.color }}
                    >
                      [{am.label}]
                    </span>
                  )}
                  <span className={`shrink-0 ${lv.text}`}>[{lv.label}]</span>
                  <span className="text-sand-100">{log.text}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function DesktopTaskRow({
  capsule,
  index,
  connectedAgents,
  onApprove,
  onReject,
}: {
  capsule: TaskCapsule;
  index: number;
  connectedAgents: AgentRecord[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const status = statusMeta[capsule.status];
  const taskMeta = taskTypeMeta[capsule.taskType];
  const executeCapsule = useOrbitStore((s) => s.executeCapsule);
  const [executing, setExecuting] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  async function handleExecute(agentId: string) {
    setExecuting(true);
    setShowAgentPicker(false);
    try {
      await executeCapsule(capsule.id, agentId);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border-b border-ink/10 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="mono-label">{capsule.id.toUpperCase()}</span>
            <span className="mono-label !text-ink-mute">·</span>
            <span className="mono-label !text-ink">{taskMeta.label}</span>
          </div>
          <h4 className="mt-1 truncate font-display text-sm font-medium text-ink">
            {capsule.goal}
          </h4>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 bg-sand-300">
              <div
                className={`h-full ${status.bar} ${capsule.status === "running" ? "progress-shimmer" : ""}`}
                style={{ width: `${capsule.progress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-ink">{capsule.progress}%</span>
          </div>
          {capsule.schedulingReason && (
            <p className="mt-1.5 text-[10px] text-ink-mute line-clamp-2">{capsule.schedulingReason}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {capsule.status === "waiting" && (
            <div className="flex gap-1">
              <button
                onClick={onApprove}
                className="flex items-center gap-1 border border-ink bg-ink px-2 py-1 text-[10px] font-semibold text-sand-50 transition-colors hover:bg-moss"
              >
                <Check size={11} strokeWidth={2.5} />
                确认
              </button>
              <button
                onClick={onReject}
                className="flex items-center justify-center border border-ink/30 px-1.5 py-1 text-ink-mute hover:border-brick hover:text-brick"
              >
                <X size={11} strokeWidth={2} />
              </button>
            </div>
          )}
          {(capsule.status === "pending" || capsule.status === "running") && connectedAgents.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAgentPicker((v) => !v)}
                disabled={executing || capsule.status === "running"}
                className="flex items-center gap-1 border border-ochre bg-ochre/10 px-2 py-1 text-[10px] font-semibold text-ochre transition-colors hover:bg-ochre hover:text-sand-50 disabled:opacity-50"
              >
                {executing ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Play size={10} strokeWidth={2.5} />
                )}
                {capsule.status === "running" ? "执行中" : "执行"}
              </button>
              {showAgentPicker && (
                <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] border border-ink bg-sand-50 shadow-structural">
                  <div className="border-b border-ink/20 px-2 py-1 mono-label">选择 AGENT</div>
                  {connectedAgents.map((a) => {
                    const m = agentKindMeta[a.kind];
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleExecute(a.id)}
                        className="flex w-full items-center gap-2 border-b border-ink/10 px-2 py-1.5 text-left text-[11px] hover:bg-sand-200"
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center border font-mono text-[8px] font-bold"
                          style={{ borderColor: m.color, color: m.color }}
                        >
                          {a.abbr}
                        </span>
                        <span className="text-ink">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}
