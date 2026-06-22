import { motion } from "framer-motion";
import { useOrbitStore } from "@/store/orbit";
import { Activity, CheckCircle2, Clock, Gauge } from "lucide-react";

export function StatsOverview() {
  const capsules = useOrbitStore((s) => s.capsules);

  const running = capsules.filter((c) => c.status === "running").length;
  const waiting = capsules.filter((c) => c.status === "waiting").length;
  const completed = capsules.filter((c) => c.status === "completed").length;
  const avgScheduleSec = 1.8; // mock

  const stats = [
    { label: "执行中", value: running, unit: "TASKS", icon: Activity, color: "text-moss" },
    { label: "等待审批", value: waiting, unit: "PENDING", icon: Clock, color: "text-amber" },
    { label: "今日完成", value: completed, unit: "DONE", icon: CheckCircle2, color: "text-ink" },
    { label: "平均调度", value: avgScheduleSec, unit: "SECONDS", icon: Gauge, color: "text-ochre" },
  ];

  return (
    <section className="grid grid-cols-2 gap-0 border border-ink bg-sand-50 lg:grid-cols-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`relative px-5 py-5 ${
              i < stats.length - 1 ? "border-b border-ink/20 lg:border-b-0 lg:border-r" : ""
            } border-ink/20`}
          >
            <div className="flex items-center justify-between">
              <span className="mono-label">{s.label}</span>
              <Icon size={14} strokeWidth={1.75} className={s.color} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="display-num text-[44px] font-medium leading-none text-ink">
                {s.value}
              </span>
              <span className="mono-label !text-ink-mute">{s.unit}</span>
            </div>
            {/* 装饰几何线 */}
            <div className="mt-3 flex gap-0.5">
              {Array.from({ length: 8 }).map((_, k) => (
                <div
                  key={k}
                  className={`h-2 ${k < (i + 1) * 2 ? "bg-ink" : "bg-ink/15"}`}
                  style={{ width: 2 + k }}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
