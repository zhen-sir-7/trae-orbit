import { motion } from "framer-motion";
import { ArrowRight, Cpu, Smartphone, Cloud, HardDrive, Server } from "lucide-react";
import type { TaskCapsule } from "@/types";
import { deviceTypeMeta, riskMeta, statusMeta, taskTypeMeta } from "@/lib/meta";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

// 手机端紧凑版任务胶囊卡片
export function PhoneCapsuleCard({
  capsule,
  index = 0,
  onClick,
}: {
  capsule: TaskCapsule;
  index?: number;
  onClick?: () => void;
}) {
  const status = statusMeta[capsule.status];
  const risk = riskMeta[capsule.riskLevel];
  const execMeta = deviceTypeMeta[capsule.executionLocation];
  const taskMeta = taskTypeMeta[capsule.taskType];
  const ExecIcon = deviceIcon[capsule.executionLocation];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={onClick}
      className="block w-full border border-ink bg-sand-50 text-left transition-all hover:bg-sand-100"
    >
      <div className={`h-1 w-full ${status.bar}`} />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="mono-label">{capsule.id.toUpperCase()}</span>
          <span className={`border px-1.5 py-0.5 text-[9px] font-semibold ${risk.chip}`}>
            {risk.label}
          </span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 font-display text-[15px] font-medium leading-snug text-ink">
          {capsule.goal}
        </h3>
        <div className="mt-2 flex items-center gap-1.5 text-[10px]">
          <ExecIcon size={11} strokeWidth={1.75} className="text-ink" />
          <span className="font-medium text-ink">{execMeta.label}</span>
          <span className="text-ink-mute">·</span>
          <span className="text-ink-mute">{taskMeta.label}</span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[9px]">
            <span className={`font-medium ${status.text}`}>● {status.label}</span>
            <span className="font-mono text-ink">{capsule.progress}%</span>
          </div>
          <div className="mt-1 h-1 w-full bg-sand-300">
            <div
              className={`h-full ${status.bar} ${capsule.status === "running" ? "progress-shimmer" : ""}`}
              style={{ width: `${capsule.progress}%` }}
            />
          </div>
        </div>
        {capsule.status === "waiting" && (
          <div className="mt-2 flex items-center justify-between border-t border-ink/15 pt-2">
            <span className="text-[10px] font-medium text-amber">待你确认</span>
            <ArrowRight size={11} className="text-amber" strokeWidth={2} />
          </div>
        )}
      </div>
    </motion.button>
  );
}
