import { Signal, Wifi, BatteryMedium } from "lucide-react";
import type { ReactNode } from "react";

// 手机外壳：结构主义风格的设备 mockup
export function PhoneFrame({
  children,
  label = "iPhone · Orbit App",
}: {
  children: ReactNode;
  label?: string;
}) {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="flex flex-col items-center">
      {/* 设备标签 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="mono-label !text-ochre">PHONE APP</span>
        <span className="h-px w-8 bg-ink/30" />
        <span className="mono-label">{label}</span>
      </div>

      {/* 手机机身 */}
      <div className="relative w-[360px] max-w-full border-[3px] border-ink bg-ink p-2 shadow-structural">
        {/* 屏幕 */}
        <div className="relative flex h-[680px] flex-col overflow-hidden bg-sand-200">
          {/* 状态栏 */}
          <div className="flex items-center justify-between bg-sand-200 px-5 py-2 text-[11px] font-semibold text-ink">
            <span className="font-mono">{time}</span>
            <div className="flex items-center gap-1.5">
              <Signal size={11} strokeWidth={2} />
              <Wifi size={11} strokeWidth={2} />
              <BatteryMedium size={13} strokeWidth={2} />
            </div>
          </div>

          {/* 灵动岛 */}
          <div className="absolute left-1/2 top-2 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>

      {/* 底部 Home 指示条 */}
      <div className="mt-2 h-1 w-16 rounded-full bg-ink/40" />
    </div>
  );
}
