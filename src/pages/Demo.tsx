import { motion } from "framer-motion";
import { ArrowRight, ArrowLeftRight, Radio } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import { PhoneFrame } from "@/components/PhoneFrame";
import { DesktopFrame } from "@/components/DesktopFrame";
import { PhoneApp } from "@/components/phone/PhoneApp";
import { DesktopExecutor } from "@/components/desktop/DesktopExecutor";

export default function Demo() {
  const devices = useOrbitStore((s) => s.devices);
  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
      {/* 顶部标题区 */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border border-ink bg-sand-50"
      >
        <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-[1.5fr_1fr] lg:px-7">
          <div>
            <div className="flex items-center gap-3">
              <span className="mono-label !text-ochre">DUAL DEVICE DEMO</span>
              <span className="h-px w-10 bg-ochre" />
              <span className="mono-label">PHONE × DESKTOP</span>
            </div>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-tightest text-ink lg:text-[40px]">
              手机 App 发起，<br />
              电脑 App <span className="text-ochre">执行</span>。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
              左侧手机 App 负责发起任务、查看进度、审批风险操作；右侧电脑 App 接入
              TRAE / Claude Code / opencode / Codex 等 AI 执行后端，处理代码、文件与浏览器任务。
              审批两端都能做。
            </p>
          </div>

          <div className="flex flex-col justify-center border border-ink/30 bg-sand-200/60 p-4">
            <div className="flex items-center gap-2">
              <Radio size={13} className={onlineCount > 0 ? "text-moss" : "text-brick"} />
              <span className="mono-label !text-ink">{onlineCount} 设备在线</span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
              <Principle n="01" text="手机发起 → 电脑执行 → 结果回传" />
              <Principle n="02" text="接入 opencode / cc / trae / codex" />
              <Principle n="03" text="审批在移动端与电脑端均可完成" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* 双设备舞台 */}
      <div className="mt-8 flex flex-col items-center justify-center gap-6 lg:flex-row lg:items-start lg:gap-4">
        {/* 手机 App */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PhoneFrame>
            <PhoneApp />
          </PhoneFrame>
        </motion.div>

        {/* 中间接力动画 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-row items-center gap-2 lg:flex-col lg:py-8"
        >
          <RelayConnector />
        </motion.div>

        {/* 电脑 App */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <DesktopFrame>
            <DesktopExecutor />
          </DesktopFrame>
        </motion.div>
      </div>

      {/* 底部说明 */}
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <RoleCard
          n="01"
          title="手机 App"
          role="随身入口"
          points={["发起任务胶囊", "查看进度与结果", "审批风险操作", "情境感知提醒"]}
        />
        <RoleCard
          n="02"
          title="电脑 App"
          role="执行端"
          points={["接入 TRAE / CC / opencode / Codex", "读写本地文件与代码", "访问浏览器登录态", "电脑端也可审批"]}
          accent
        />
        <RoleCard
          n="03"
          title="跨端接力"
          role="任务流转"
          points={["任务不绑定设备", "上下文随人走", "调度可解释", "算力随任务动"]}
        />
      </div>
    </div>
  );
}

function RelayConnector() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1">
        <ArrowLeftRight size={14} className="text-ochre" strokeWidth={1.75} />
        <span className="mono-label !text-ochre">RELAY</span>
      </div>
      {/* 横向流动连线（桌面布局） */}
      <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="hidden lg:block">
        <line x1="2" y1="20" x2="70" y2="20" stroke="#B85C38" strokeWidth="1.5" className="dash-flow" />
        <path d="M70 14 L78 20 L70 26 Z" fill="#B85C38" />
      </svg>
      {/* 竖向流动连线（移动布局） */}
      <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className="block lg:hidden">
        <line x1="20" y1="2" x2="20" y2="50" stroke="#B85C38" strokeWidth="1.5" className="dash-flow" />
        <path d="M14 50 L20 58 L26 50 Z" fill="#B85C38" />
      </svg>
      <span className="mono-label text-center">任务胶囊<br />跨端流转</span>
    </div>
  );
}

function Principle({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mono-label !text-ochre shrink-0">{n}</span>
      <span className="text-ink-soft">{text}</span>
    </div>
  );
}

function RoleCard({
  n,
  title,
  role,
  points,
  accent,
}: {
  n: string;
  title: string;
  role: string;
  points: string[];
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border p-4 ${accent ? "border-ink bg-sand-50 shadow-structural" : "border-ink/30 bg-sand-50"}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="mono-label !text-ochre">{n}</span>
        <span className="mono-label">{role}</span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-ink-soft">
            <ArrowRight size={11} className="mt-0.5 shrink-0 text-ochre" strokeWidth={1.75} />
            {p}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
