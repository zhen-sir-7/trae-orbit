import { motion } from "framer-motion";
import {
  Circle,
  Plus,
  GitBranch,
  ArrowLeftRight,
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { TimelineEvent } from "@/types";
import { deviceTypeMeta } from "@/lib/meta";

const kindMeta: Record<
  TimelineEvent["kind"],
  { icon: typeof Circle; color: string; bg: string }
> = {
  create: { icon: Plus, color: "text-ink", bg: "bg-ink" },
  schedule: { icon: GitBranch, color: "text-ochre", bg: "bg-ochre" },
  relay: { icon: ArrowLeftRight, color: "text-ochre", bg: "bg-ochre" },
  progress: { icon: Activity, color: "text-moss", bg: "bg-moss" },
  approval: { icon: ShieldCheck, color: "text-amber", bg: "bg-amber" },
  complete: { icon: CheckCircle2, color: "text-ink", bg: "bg-ink" },
  fail: { icon: XCircle, color: "text-brick", bg: "bg-brick" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {/* 垂直主轴 */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-ink/30" />

      {events.map((ev, i) => {
        const meta = kindMeta[ev.kind];
        const Icon = meta.icon;
        const isLast = i === events.length - 1;
        return (
          <motion.li
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="relative pl-8 pb-6 last:pb-0"
          >
            {/* 节点方块 */}
            <div
              className={`absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center border border-ink ${meta.bg}`}
            >
              <Icon size={9} strokeWidth={2.5} className="text-sand-50" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs font-semibold text-ink">{ev.ts}</span>
              <span className="mono-label">·</span>
              <span className="text-sm font-semibold text-ink">{ev.title}</span>
              {ev.device && (
                <span className="mono-label !text-ochre">
                  @ {deviceTypeMeta[ev.device].label}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{ev.detail}</p>

            {!isLast && <div className="mt-3 h-px w-full bg-ink/10" />}
          </motion.li>
        );
      })}
    </ol>
  );
}
