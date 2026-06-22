import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Shield,
  Check,
  Clock,
  ArrowLeftRight,
  Plus,
  GitBranch,
  Activity,
  CheckCircle2,
  Cpu,
  Smartphone,
  Cloud,
  HardDrive,
  Server,
} from "lucide-react";
import type { TaskCapsule, TimelineEvent } from "@/types";
import { deviceTypeMeta, riskMeta, statusMeta, taskTypeMeta } from "@/lib/meta";
import { useOrbitStore } from "@/store/orbit";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

const kindIcon: Record<TimelineEvent["kind"], typeof Plus> = {
  create: Plus,
  schedule: GitBranch,
  relay: ArrowLeftRight,
  progress: Activity,
  approval: Shield,
  complete: CheckCircle2,
  fail: X,
};

export function PhoneCapsuleDetail({
  capsule,
  onClose,
}: {
  capsule: TaskCapsule;
  onClose: () => void;
}) {
  const approve = useOrbitStore((s) => s.approveCapsule);
  const [approving, setApproving] = useState(false);
  const status = statusMeta[capsule.status];
  const risk = riskMeta[capsule.riskLevel];
  const execMeta = deviceTypeMeta[capsule.executionLocation];
  const taskMeta = taskTypeMeta[capsule.taskType];
  const ExecIcon = deviceIcon[capsule.executionLocation];

  async function handleApprove() {
    setApproving(true);
    try {
      await approve(capsule.id, true);
      onClose();
    } finally {
      setApproving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-40 flex flex-col bg-sand-200"
    >
      {/* 顶部 */}
      <div className={`h-1 w-full ${status.bar}`} />
      <div className="flex items-center justify-between border-b border-ink bg-sand-50 px-4 py-3">
        <button onClick={onClose} className="text-ink-mute hover:text-ink">
          <X size={18} strokeWidth={1.75} />
        </button>
        <span className="mono-label">{capsule.id.toUpperCase()}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 目标 */}
        <div className="border-b border-ink/15 bg-sand-50 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="mono-label !text-ink">{taskMeta.label}</span>
            <span className={`border px-1.5 py-0.5 text-[9px] font-semibold ${risk.chip}`}>
              {risk.label}
            </span>
          </div>
          <h1 className="mt-2 font-display text-[20px] font-semibold leading-snug text-ink">
            {capsule.goal}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <ExecIcon size={14} strokeWidth={1.75} className="text-ink" />
            <span className="text-xs font-medium text-ink">执行 · {execMeta.label}</span>
            <span className="text-ink-mute">·</span>
            <span className={`text-xs font-medium ${status.text}`}>● {status.label}</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px]">
              <span className="mono-label">PROGRESS</span>
              <span className="font-mono text-ink">{capsule.progress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-sand-300">
              <div
                className={`h-full ${status.bar} ${capsule.status === "running" ? "progress-shimmer" : ""}`}
                style={{ width: `${capsule.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 调度解释 */}
        <Section title="调度解释" caption="SCHEDULING">
          <div className="border-l-2 border-ochre bg-sand-50 px-3 py-2.5">
            <p className="text-[13px] leading-relaxed text-ink">{capsule.schedulingReason}</p>
          </div>
        </Section>

        {/* 跨端接力 */}
        {capsule.relays.length > 0 && (
          <Section title="跨端接力" caption="RELAY">
            <div className="space-y-2">
              {capsule.relays.map((r, i) => (
                <div key={i} className="border border-ink/20 bg-sand-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <ArrowLeftRight size={11} className="text-ochre" />
                    {deviceTypeMeta[r.fromDevice].label}
                    <span className="text-ochre">→</span>
                    {deviceTypeMeta[r.toDevice].label}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">{r.reason}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 时间线 */}
        <Section title="时间线" caption="TIMELINE">
          <ol className="relative pl-5">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink/30" />
            {capsule.timeline.map((ev, i) => {
              const Icon = kindIcon[ev.kind];
              return (
                <li key={ev.id} className="relative pb-4 last:pb-0">
                  <div
                    className={`absolute -left-5 top-0.5 flex h-[14px] w-[14px] items-center justify-center border border-ink ${
                      ev.kind === "approval" ? "bg-amber" : ev.kind === "complete" ? "bg-ink" : "bg-ochre"
                    }`}
                  >
                    <Icon size={8} strokeWidth={2.5} className="text-sand-50" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-ink">{ev.ts}</span>
                    <span className="text-xs font-semibold text-ink">{ev.title}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{ev.detail}</p>
                  {i < capsule.timeline.length - 1 && <div className="mt-2 h-px w-full bg-ink/10" />}
                </li>
              );
            })}
          </ol>
        </Section>

        {/* 下一步 */}
        <Section title="下一步" caption="NEXT">
          <div className="border border-ink bg-sand-200/60 px-3 py-2">
            <div className="flex items-start gap-1.5">
              {capsule.status === "waiting" ? (
                <Clock size={13} className="mt-0.5 text-amber" />
              ) : (
                <Activity size={13} className="mt-0.5 text-ink" />
              )}
              <span className="text-xs text-ink">{capsule.nextAction}</span>
            </div>
          </div>
        </Section>

        <div className="h-4" />
      </div>

      {/* 底部审批按钮 */}
      {capsule.status === "waiting" && (
        <div className="border-t border-ink bg-sand-50 p-3">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex w-full items-center justify-center gap-2 border border-ink bg-ink px-4 py-3 text-sm font-semibold text-sand-50 transition-colors hover:bg-moss disabled:opacity-50"
          >
            <Check size={15} strokeWidth={2.5} />
            {approving ? "审批中…" : "确认审批"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-ink/15 px-4 py-4">
      <div className="mb-2.5 flex items-baseline justify-between border-b border-ink/20 pb-1">
        <span className="font-display text-sm font-semibold text-ink">{title}</span>
        <span className="mono-label">{caption}</span>
      </div>
      {children}
    </section>
  );
}
