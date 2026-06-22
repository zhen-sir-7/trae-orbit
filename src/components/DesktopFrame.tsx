import { Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";

// 电脑端窗口外壳：结构主义风格的桌面应用 mockup
export function DesktopFrame({
  children,
  title = "Orbit Desktop · 执行端",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="flex flex-col">
      {/* 设备标签 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="mono-label !text-ochre">DESKTOP APP</span>
        <span className="h-px w-8 bg-ink/30" />
        <span className="mono-label">{title}</span>
      </div>

      {/* 窗口机身 */}
      <div className="w-[680px] max-w-full border-[3px] border-ink bg-sand-50 shadow-structural">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-sand-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 border border-ink bg-brick" />
            <span className="h-3 w-3 border border-ink bg-amber" />
            <span className="h-3 w-3 border border-ink bg-moss" />
          </div>
          <span className="mono-label !text-ink">{title}</span>
          <div className="flex items-center gap-3 text-ink">
            <Minus size={13} strokeWidth={2} />
            <Square size={11} strokeWidth={2} />
            <X size={13} strokeWidth={2} />
          </div>
        </div>

        {/* 内容区 */}
        <div className="h-[680px] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
