import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Cpu,
  Smartphone,
  Cloud,
  HardDrive,
  Server,
  Shield,
  FileText,
  MessageSquare,
  FolderGit2,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import { deviceTypeMeta, riskMeta, statusMeta, taskTypeMeta } from "@/lib/meta";
import { Timeline } from "@/components/Timeline";
import { RelayFlow } from "@/components/RelayFlow";
import type { DeviceType } from "@/types";

const deviceIcon: Record<DeviceType, typeof Cpu> = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
};

export default function CapsuleDetail() {
  const { id } = useParams();
  const capsule = useOrbitStore((s) => s.capsules.find((c) => c.id === id));
  const approve = useOrbitStore((s) => s.approveCapsule);

  if (!capsule) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-ink">未找到该任务胶囊</p>
        <Link to="/" className="mt-4 inline-block text-ochre underline">
          返回控制台
        </Link>
      </div>
    );
  }

  const status = statusMeta[capsule.status];
  const risk = riskMeta[capsule.riskLevel];
  const execMeta = deviceTypeMeta[capsule.executionLocation];
  const originMeta = deviceTypeMeta[capsule.originDevice];
  const taskMeta = taskTypeMeta[capsule.taskType];
  const ExecIcon = deviceIcon[capsule.executionLocation];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-ink-mute transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={1.75} />
        返回控制台
      </Link>

      {/* 头部 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mt-5 border border-ink bg-sand-50"
      >
        <div className={`h-1.5 w-full ${status.bar}`} />
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.6fr_1fr] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono-label">{capsule.id.toUpperCase()}</span>
              <span className="text-ink-mute">·</span>
              <span className="mono-label !text-ink">{taskMeta.label}</span>
              <span className={`border px-2 py-0.5 text-[10px] font-semibold ${risk.chip}`}>
                <Shield size={9} className="mr-1 inline" strokeWidth={2} />
                {risk.label}
              </span>
            </div>
            <h1 className="mt-4 font-display text-[34px] font-semibold leading-tight tracking-tightest text-ink lg:text-[40px]">
              {capsule.goal}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1.5 font-medium ${status.text}`}>
                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="text-ink-mute">·</span>
              <span className="text-ink-soft">创建于 {capsule.createdAt}</span>
              <span className="text-ink-mute">·</span>
              <span className="text-ink-soft">更新于 {capsule.updatedAt}</span>
            </div>
          </div>

          {/* 执行端卡片 */}
          <div className="border border-ink/30 bg-sand-200/50 p-5">
            <div className="mono-label">EXECUTION</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border border-ink bg-sand-50">
                <ExecIcon size={20} strokeWidth={1.75} className="text-ink" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold text-ink">{execMeta.label}</div>
                <div className="mono-label mt-0.5">CURRENT EXECUTOR</div>
              </div>
            </div>
            <div className="mt-4 border-t border-ink/20 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="mono-label">ORIGIN</span>
                <span className="font-medium text-ink">{originMeta.label}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="mono-label">RELAYS</span>
                <span className="font-mono text-ink">{capsule.relays.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="mono-label">PROGRESS</span>
                <span className="font-mono text-ink">{capsule.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="border-t border-ink/20 px-6 py-4 lg:px-8">
          <div className="h-2 w-full bg-sand-300">
            <div
              className={`relative h-full ${status.bar} ${capsule.status === "running" ? "progress-shimmer" : ""}`}
              style={{ width: `${capsule.progress}%` }}
            />
          </div>
        </div>
      </motion.section>

      {/* 主体网格 */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* 左：调度解释 + 上下文 + 中间结果 */}
        <div className="space-y-8">
          <Block index="01" title="调度解释" caption="SCHEDULING REASON">
            <div className="border-l-2 border-ochre bg-sand-50 px-5 py-4">
              <p className="text-[15px] leading-relaxed text-ink">{capsule.schedulingReason}</p>
            </div>
          </Block>

          <Block index="02" title="任务上下文" caption="CONTEXT">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ContextItem
                icon={FileText}
                label="文件"
                value={capsule.context.files?.length ? `${capsule.context.files.length} 个文件` : "—"}
                detail={capsule.context.files?.join(", ")}
              />
              <ContextItem
                icon={MessageSquare}
                label="对话"
                value={capsule.context.conversation ?? "—"}
              />
              <ContextItem
                icon={FolderGit2}
                label="代码路径"
                value={capsule.context.codePath ?? "—"}
              />
              <ContextItem
                icon={History}
                label="历史决策"
                value={
                  capsule.context.history?.length
                    ? `${capsule.context.history.length} 条`
                    : "—"
                }
                detail={capsule.context.history?.join("；")}
              />
            </div>
          </Block>

          <Block index="03" title="中间结果" caption="INTERMEDIATE RESULTS">
            {capsule.intermediateResults.length > 0 ? (
              <ul className="space-y-2">
                {capsule.intermediateResults.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 border border-ink/20 bg-sand-50 px-4 py-3"
                  >
                    <span className="mono-label !text-moss shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm text-ink-soft">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint text="暂无中间结果" />
            )}
          </Block>
        </div>

        {/* 右：权限 + 下一步 + 审批 + 时间线 */}
        <div className="space-y-8">
          <Block index="04" title="权限需求" caption="PERMISSIONS">
            <ul className="space-y-1.5">
              {capsule.permissions.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2 border border-ink/20 bg-sand-50 px-3 py-2 text-xs text-ink-soft"
                >
                  <Shield size={12} strokeWidth={1.75} className="text-ochre" />
                  {p}
                </li>
              ))}
            </ul>
          </Block>

          <Block index="05" title="下一步动作" caption="NEXT ACTION">
            <div className="border border-ink bg-sand-200/60 px-4 py-3">
              <div className="flex items-start gap-2">
                {capsule.status === "waiting" ? (
                  <Clock size={14} className="mt-0.5 shrink-0 text-amber" />
                ) : capsule.status === "completed" ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-moss" />
                ) : (
                  <Activity size={14} className="mt-0.5 shrink-0 text-ink" />
                )}
                <span className="text-sm text-ink">{capsule.nextAction}</span>
              </div>
            </div>

            {capsule.status === "waiting" && (
              <button
                onClick={() => approve(capsule.id, true)}
                className="mt-3 w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-ochre"
              >
                确认审批
              </button>
            )}
          </Block>

          {capsule.riskLevel === "high" || capsule.riskLevel === "critical" ? (
            <div className="border border-brick/50 bg-brick/8 px-4 py-3">
              <div className="flex items-center gap-2 text-brick">
                <AlertTriangle size={14} strokeWidth={2} />
                <span className="text-xs font-semibold">高风险任务</span>
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">
                涉及敏感操作时，每次执行前都需要在手机端审批确认。
              </p>
            </div>
          ) : null}

          <Block index="06" title="进度时间线" caption="TIMELINE">
            <Timeline events={capsule.timeline} />
          </Block>
        </div>
      </div>

      {/* 跨端接力 */}
      <div className="mt-10">
        <BlockTitle index="07" title="跨端接力路径" caption="RELAY FLOW" />
        <RelayFlow relays={capsule.relays} />
      </div>
    </div>
  );
}

function Block({
  index,
  title,
  caption,
  children,
}: {
  index: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <BlockTitle index={index} title={title} caption={caption} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BlockTitle({ index, title, caption }: { index: string; title: string; caption: string }) {
  return (
    <div className="flex items-end justify-between border-b border-ink pb-2">
      <div className="flex items-baseline gap-3">
        <span className="mono-label !text-ochre">{index}</span>
        <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      </div>
      <span className="mono-label">{caption}</span>
    </div>
  );
}

function ContextItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border border-ink/20 bg-sand-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon size={13} strokeWidth={1.75} className="text-ink-mute" />
        <span className="mono-label">{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-ink">{value}</div>
      {detail && <div className="mt-1 text-[11px] text-ink-mute">{detail}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-ink/30 bg-sand-50 px-4 py-6 text-center text-xs text-ink-mute">
      {text}
    </div>
  );
}

