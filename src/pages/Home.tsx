import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Filter, Layers } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import { StatsOverview } from "@/components/StatsOverview";
import { CapsuleCard } from "@/components/CapsuleCard";
import { DevicePool } from "@/components/DevicePool";
import { NodePanel } from "@/components/NodePanel";
import { ContextBridge } from "@/components/ContextBridge";
import type { TaskStatus } from "@/types";

const filters: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "running", label: "执行中" },
  { key: "waiting", label: "等待确认" },
  { key: "pending", label: "待执行" },
  { key: "completed", label: "已完成" },
];

export default function Home() {
  const capsules = useOrbitStore((s) => s.capsules);
  const [active, setActive] = useState<TaskStatus | "all">("all");

  const filtered = useMemo(
    () => (active === "all" ? capsules : capsules.filter((c) => c.status === active)),
    [capsules, active]
  );

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
      {/* Hero 区 */}
      <HeroSection />

      {/* 状态总览 */}
      <div className="mt-10">
        <SectionTitle index="01" title="状态总览" caption="OVERVIEW" />
        <StatsOverview />
      </div>

      {/* 任务胶囊 + 设备池 */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <SectionTitle index="02" title="任务胶囊" caption="TASK CAPSULES">
            <ContextBridge />
          </SectionTitle>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1 border border-ink/30 bg-sand-50 p-0.5">
              <Filter size={12} className="ml-2 text-ink-mute" />
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActive(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    active === f.key
                      ? "bg-ink text-sand-50"
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="mono-label">{filtered.length} CAPSULES</span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filtered.map((c, i) => (
              <CapsuleCard key={c.id} capsule={c} index={i} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="border border-dashed border-ink/30 bg-sand-50 px-6 py-16 text-center">
              <Layers size={28} className="mx-auto text-ink-mute" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-ink-mute">该状态下暂无任务胶囊</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle index="03" title="设备资源池" caption="DEVICE POOL" />
          <DevicePool />
          <div className="mt-8">
            <SectionTitle index="04" title="联邦节点" caption="FEDERATED NODES" />
            <NodePanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border border-ink bg-sand-50">
      {/* 装饰几何 */}
      <div className="pointer-events-none absolute inset-0">
        <svg className="absolute right-0 top-0 h-full w-1/2 opacity-[0.07]" viewBox="0 0 400 300" fill="none">
          <circle cx="300" cy="150" r="120" stroke="#1A1A1A" strokeWidth="1" />
          <circle cx="300" cy="150" r="80" stroke="#1A1A1A" strokeWidth="1" />
          <circle cx="300" cy="150" r="40" stroke="#1A1A1A" strokeWidth="1" />
          <line x1="0" y1="150" x2="400" y2="150" stroke="#1A1A1A" strokeWidth="0.5" />
          <line x1="300" y1="0" x2="300" y2="300" stroke="#1A1A1A" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative grid grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1.4fr_1fr] lg:px-10 lg:py-14">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <span className="mono-label !text-ochre">ORBIT CONSOLE</span>
              <span className="h-px w-12 bg-ochre" />
              <span className="mono-label">v0.1 MVP</span>
            </div>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.05] tracking-tightest text-ink lg:text-[56px]">
              AI 随人走，
              <br />
              算力<span className="text-ochre">随任务动</span>。
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              每个任务被封装成可流转的「任务胶囊」，在手机、电脑、云端之间智能接力。
              你只需提出目标、确认关键节点、验收结果——系统会根据任务复杂度、设备状态与隐私要求，
              自动选择最合适的执行端。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="group inline-flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-ochre"
              >
                发起一个任务胶囊
                <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/capsule/cap-001"
                className="inline-flex items-center gap-2 border border-ink bg-transparent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-sand-200"
              >
                查看胶囊示例
              </Link>
            </div>
          </motion.div>
        </div>

        {/* 右侧：核心概念卡 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col justify-center border border-ink/30 bg-sand-200/60 p-5"
        >
          <div className="mono-label">CORE PRINCIPLE</div>
          <p className="mt-3 font-display text-[22px] font-medium leading-snug text-ink">
            它迁移的是<span className="text-ochre">任务</span>，
            <br />
            不是屏幕。
          </p>
          <div className="mt-5 space-y-2 border-t border-ink/20 pt-4 text-xs text-ink-soft">
            <PrincipleRow n="01" text="任务不绑定设备，而是绑定用户目标" />
            <PrincipleRow n="02" text="每次调度都给出可解释的理由" />
            <PrincipleRow n="03" text="高风险操作必须手机端审批" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PrincipleRow({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mono-label !text-ochre">{n}</span>
      <span className="text-ink-soft">{text}</span>
    </div>
  );
}

function SectionTitle({ index, title, caption, children }: { index: string; title: string; caption: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between border-b border-ink pb-2">
      <div className="flex items-baseline gap-3">
        <span className="mono-label !text-ochre">{index}</span>
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {children}
      </div>
      <span className="mono-label">{caption}</span>
    </div>
  );
}
