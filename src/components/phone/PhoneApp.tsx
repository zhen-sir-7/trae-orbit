import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ListChecks, Plus, MonitorSmartphone } from "lucide-react";
import { PhoneConsole } from "./PhoneConsole";
import { PhoneNewTask } from "./PhoneNewTask";
import { PhoneDevices } from "./PhoneDevices";
import { PhoneCapsuleDetail } from "./PhoneCapsuleDetail";
import type { TaskCapsule } from "@/types";

type Tab = "tasks" | "new" | "devices";

export function PhoneApp() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [detail, setDetail] = useState<TaskCapsule | null>(null);

  return (
    <div className="relative flex h-full flex-col">
      {/* 主内容 */}
      <div className="relative flex-1 overflow-hidden">
        {tab === "tasks" && (
          <PhoneConsole
            onOpenCapsule={(c) => setDetail(c)}
            onGoNew={() => setTab("new")}
          />
        )}
        {tab === "new" && (
          <PhoneNewTask
            onBack={() => setTab("tasks")}
            onDone={() => setTab("tasks")}
          />
        )}
        {tab === "devices" && <PhoneDevices />}
      </div>

      {/* 详情浮层 */}
      <AnimatePresence>
        {detail && <PhoneCapsuleDetail capsule={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>

      {/* 底部 Tab 栏 */}
      <nav className="flex border-t-[3px] border-ink bg-sand-50">
        <TabButton
          active={tab === "tasks"}
          onClick={() => setTab("tasks")}
          icon={ListChecks}
          label="任务"
        />
        <TabButton
          active={tab === "new"}
          onClick={() => setTab("new")}
          icon={Plus}
          label="新建"
          accent
        />
          <TabButton
            active={tab === "devices"}
            onClick={() => setTab("devices")}
            icon={MonitorSmartphone}
            label="设备"
          />
        </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Plus;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? "text-ochre" : "text-ink-mute hover:text-ink"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span className="text-[10px] font-medium">{label}</span>
      {active && <span className="absolute top-0 h-0.5 w-8 bg-ochre" />}
      {accent && !active && (
        <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-ochre" />
      )}
    </button>
  );
}
