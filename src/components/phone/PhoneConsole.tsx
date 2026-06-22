import { Activity, CheckCircle2, Clock, Plus } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import { PhoneCapsuleCard } from "./PhoneCapsuleCard";
import type { TaskCapsule } from "@/types";

export function PhoneConsole({
  onOpenCapsule,
  onGoNew,
}: {
  onOpenCapsule: (c: TaskCapsule) => void;
  onGoNew: () => void;
}) {
  const capsules = useOrbitStore((s) => s.capsules);

  const running = capsules.filter((c) => c.status === "running").length;
  const waiting = capsules.filter((c) => c.status === "waiting").length;
  const completed = capsules.filter((c) => c.status === "completed").length;

  return (
    <div className="flex h-full flex-col">
      {/* 顶部品牌区 */}
      <div className="border-b border-ink bg-sand-50 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="mono-label !text-ochre">ORBIT</div>
            <h1 className="font-display text-[22px] font-semibold leading-tight text-ink">
              任务控制台
            </h1>
          </div>
          <button
            onClick={onGoNew}
            className="flex h-9 w-9 items-center justify-center border border-ink bg-ink text-sand-50 transition-colors hover:bg-ochre"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>

        {/* 状态条 */}
        <div className="mt-3 grid grid-cols-3 gap-0 border border-ink">
          <Stat icon={Activity} value={running} label="执行中" color="text-moss" />
          <Stat icon={Clock} value={waiting} label="待审批" color="text-amber" border />
          <Stat icon={CheckCircle2} value={completed} label="已完成" color="text-ink" border />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="mono-label">任务胶囊</span>
          <span className="mono-label">{capsules.length}</span>
        </div>
        <div className="space-y-2.5">
          {capsules.map((c, i) => (
            <PhoneCapsuleCard
              key={c.id}
              capsule={c}
              index={i}
              onClick={() => onOpenCapsule(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  color,
  border,
}: {
  icon: typeof Activity;
  value: number;
  label: string;
  color: string;
  border?: boolean;
}) {
  return (
    <div className={`px-2 py-2.5 text-center ${border ? "border-l border-ink" : ""}`}>
      <Icon size={12} strokeWidth={2} className={`mx-auto ${color}`} />
      <div className="mt-1 font-display text-xl font-semibold leading-none text-ink">{value}</div>
      <div className="mt-0.5 text-[9px] text-ink-mute">{label}</div>
    </div>
  );
}
