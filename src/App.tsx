import { motion } from "framer-motion";
import { Smartphone, Monitor, ArrowRight, ArrowLeftRight } from "lucide-react";
import { OrbitLogo } from "@/components/Logo";

// 入口选择页：手机端 / 电脑端 两个独立 app 的分发入口
export default function App() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      {/* 背景几何 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute -right-20 -top-20 h-[520px] w-[520px] opacity-[0.06]"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="180" stroke="#1A1A1A" strokeWidth="1" />
          <circle cx="200" cy="200" r="130" stroke="#1A1A1A" strokeWidth="1" />
          <circle cx="200" cy="200" r="80" stroke="#1A1A1A" strokeWidth="1" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="#1A1A1A" strokeWidth="0.5" />
          <line x1="200" y1="0" x2="200" y2="400" stroke="#1A1A1A" strokeWidth="0.5" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[760px]"
      >
        {/* 品牌区 */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <OrbitLogo size={40} />
            <div className="text-left leading-none">
              <div className="font-display text-[26px] font-semibold tracking-tightest text-ink">
                TRAE Orbit
              </div>
              <div className="mono-label mt-1">AI · FOLLOWS · YOU</div>
            </div>
          </div>
          <h1 className="mt-5 font-display text-[34px] font-semibold leading-[1.08] tracking-tight text-ink lg:text-[42px]">
            AI 随人走，算力<span className="text-ochre">随任务动</span>。
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            选择入口：手机端发起任务，电脑端执行任务。
          </p>
        </div>

        {/* 两入口卡片 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EntryCard
            to="/phone.html"
            icon={Smartphone}
            badge="PHONE APP"
            title="手机端"
            role="随身入口"
            points={["发起任务胶囊", "查看进度与结果", "审批风险操作", "设备资源池"]}
            delay={0.1}
          />
          <EntryCard
            to="/desktop.html"
            icon={Monitor}
            badge="DESKTOP APP"
            title="电脑端"
            role="执行端"
            points={["接入 TRAE / CC / opencode", "本机执行代码与文件", "实时执行日志", "联邦节点管理"]}
            accent
            delay={0.2}
          />
        </div>

        {/* 接力说明 */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-mute">
          <ArrowLeftRight size={13} className="text-ochre" strokeWidth={1.75} />
          <span className="mono-label">任务胶囊跨端流转 · 同账号多端组建设备池</span>
        </div>
      </motion.div>
    </div>
  );
}

function EntryCard({
  to,
  icon: Icon,
  badge,
  title,
  role,
  points,
  accent,
  delay,
}: {
  to: string;
  icon: typeof Smartphone;
  badge: string;
  title: string;
  role: string;
  points: string[];
  accent?: boolean;
  delay: number;
}) {
  return (
    <motion.a
      href={to}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`group block border-2 p-5 transition-colors ${
        accent
          ? "border-ink bg-sand-50 shadow-structural hover:bg-sand-100"
          : "border-ink/40 bg-sand-50 hover:border-ink hover:bg-sand-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center border-2 ${
              accent ? "border-ochre bg-ochre/10" : "border-ink bg-sand-200"
            }`}
          >
            <Icon size={20} className={accent ? "text-ochre" : "text-ink"} strokeWidth={1.75} />
          </div>
          <div>
            <div className={`mono-label ${accent ? "!text-ochre" : ""}`}>{badge}</div>
            <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          </div>
        </div>
        <ArrowRight
          size={18}
          className="text-ink-mute transition-all group-hover:translate-x-1 group-hover:text-ochre"
          strokeWidth={2}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="mono-label !text-ink-mute">ROLE</span>
        <span className="text-xs font-medium text-ink">{role}</span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-ink/15 pt-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-ink-soft">
            <span className="mt-1.5 h-1 w-1 shrink-0 bg-ochre" />
            {p}
          </li>
        ))}
      </ul>
    </motion.a>
  );
}
