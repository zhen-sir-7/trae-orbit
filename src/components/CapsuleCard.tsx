import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Cpu, Smartphone, Cloud, HardDrive, Server } from "lucide-react";
import type { TaskCapsule } from "@/types";
import { deviceTypeMeta, riskMeta, statusMeta, taskTypeMeta } from "@/lib/meta";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

export function CapsuleCard({ capsule, index = 0 }: { capsule: TaskCapsule; index?: number }) {
  const status = statusMeta[capsule.status];
  const risk = riskMeta[capsule.riskLevel];
  const execMeta = deviceTypeMeta[capsule.executionLocation];
  const originMeta = deviceTypeMeta[capsule.originDevice];
  const taskMeta = taskTypeMeta[capsule.taskType];
  const ExecIcon = deviceIcon[capsule.executionLocation];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/capsule/${capsule.id}`}
        className="group block border border-ink bg-sand-50 transition-all hover:bg-sand-100 hover:shadow-structural"
      >
        {/* 顶部状态色条 */}
        <div className={`h-1 w-full ${status.bar}`} />

        <div className="p-5">
          {/* 头部：ID + 状态 + 风险 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="mono-label">{capsule.id.toUpperCase()}</span>
              <span className="text-ink-mute">·</span>
              <span className="mono-label !text-ink">{taskMeta.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className={`border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${risk.chip}`}>
                {risk.label}
              </span>
            </div>
          </div>

          {/* 目标 */}
          <h3 className="mt-3 font-display text-[19px] font-medium leading-snug text-ink">
            {capsule.goal}
          </h3>

          {/* 执行位置 + 起源设备 */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 border border-ink/40 bg-sand-200 px-2 py-1">
              <ExecIcon size={12} strokeWidth={1.75} />
              <span className="font-medium text-ink">执行 · {execMeta.label}</span>
            </span>
            {capsule.originDevice !== capsule.executionLocation && (
              <>
                <span className="mono-label">FROM</span>
                <span className="inline-flex items-center gap-1.5 border border-ink/20 px-2 py-1 text-ink-mute">
                  {originMeta.label}
                </span>
              </>
            )}
            {capsule.relays.length > 0 && (
              <span className="mono-label !text-ochre">· {capsule.relays.length} 次接力</span>
            )}
          </div>

          {/* 进度 */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="mono-label">PROGRESS</span>
              <span className="font-mono text-ink">{capsule.progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-sand-300">
              <div
                className={`relative h-full ${status.bar} ${capsule.status === "running" ? "progress-shimmer" : ""}`}
                style={{ width: `${capsule.progress}%` }}
              />
            </div>
          </div>

          {/* 下一步 */}
          <div className="mt-4 flex items-center justify-between border-t border-ink/15 pt-3">
            <span className="text-xs text-ink-soft">
              <span className="mono-label mr-2">NEXT</span>
              {capsule.nextAction}
            </span>
            <ArrowUpRight
              size={16}
              className="text-ink-mute transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ochre"
              strokeWidth={1.75}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
