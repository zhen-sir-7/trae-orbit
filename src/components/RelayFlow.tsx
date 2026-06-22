import { motion } from "framer-motion";
import { ArrowRight, Smartphone, Cpu, HardDrive, Cloud, Server } from "lucide-react";
import type { RelayHop } from "@/types";
import { deviceTypeMeta } from "@/lib/meta";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

export function RelayFlow({ relays }: { relays: RelayHop[] }) {
  if (relays.length === 0) {
    return (
      <div className="border border-dashed border-ink/30 bg-sand-50 px-4 py-6 text-center text-xs text-ink-mute">
        本任务未发生跨端接力
      </div>
    );
  }

  // 构建节点序列：起点 → 中间 → 终点
  const nodes: { device: RelayHop["fromDevice"]; ts: string; reason?: string }[] = [
    { device: relays[0].fromDevice, ts: relays[0].ts },
    ...relays.map((r) => ({ device: r.toDevice, ts: r.ts, reason: r.reason })),
  ];

  return (
    <div className="space-y-4">
      {/* 横向节点流 */}
      <div className="overflow-x-auto border border-ink/30 bg-sand-50 p-5">
        <div className="flex min-w-full items-center gap-2">
          {nodes.map((node, i) => {
            const Icon = deviceIcon[node.device];
            const meta = deviceTypeMeta[node.device];
            const isLast = i === nodes.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: i * 0.12 }}
                className="flex items-center gap-2"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center border ${
                      isLast ? "border-ochre bg-ochre/10" : "border-ink bg-sand-200"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      className={isLast ? "text-ochre" : "text-ink"}
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-semibold text-ink">{meta.label}</span>
                  <span className="mono-label mt-0.5">{node.ts}</span>
                </div>
                {!isLast && (
                  <div className="flex flex-col items-center pb-6">
                    <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
                      <line
                        x1="0"
                        y1="7"
                        x2="50"
                        y2="7"
                        stroke="#B85C38"
                        strokeWidth="1.5"
                        className="dash-flow"
                      />
                      <path d="M50 2 L58 7 L50 12 Z" fill="#B85C38" />
                    </svg>
                    <ArrowRight size={0} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 接力理由列表 */}
      <ul className="space-y-2">
        {relays.map((r, i) => (
          <li
            key={i}
            className="flex items-start gap-3 border-l-2 border-ochre bg-sand-50 px-4 py-3"
          >
            <span className="mono-label !text-ochre shrink-0">HOP {i + 1}</span>
            <div className="text-xs text-ink-soft">
              <span className="font-semibold text-ink">
                {deviceTypeMeta[r.fromDevice].label} → {deviceTypeMeta[r.toDevice].label}
              </span>
              <span className="mx-2 text-ink-mute">·</span>
              <span>{r.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
