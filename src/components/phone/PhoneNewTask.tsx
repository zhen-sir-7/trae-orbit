import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Shield,
  AlertTriangle,
  FileText,
  MessageSquare,
  Loader2,
  Cpu,
  Smartphone,
  Cloud,
  HardDrive,
  Server,
} from "lucide-react";
import { useOrbitStore, currentDeviceId, currentDeviceType } from "@/store/orbit";
import { taskTypeMeta, deviceTypeMeta, riskMeta } from "@/lib/meta";
import type { RiskLevel, TaskCapsule, TaskType } from "@/types";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

type Step = "input" | "scheduling" | "result" | "approval";

const taskTypeOptions: { type: TaskType; label: string }[] = [
  { type: "qa", label: "问答/摘要" },
  { type: "file-analysis", label: "文件分析" },
  { type: "code", label: "代码任务" },
  { type: "bulk", label: "批量处理" },
  { type: "browser-auth", label: "登录态" },
  { type: "high-risk", label: "高风险" },
];

export function PhoneNewTask({
  onDone,
  onBack,
}: {
  onDone: (capsule: TaskCapsule) => void;
  onBack: () => void;
}) {
  const createCapsule = useOrbitStore((s) => s.createCapsule);

  const [step, setStep] = useState<Step>("input");
  const [goal, setGoal] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("file-analysis");
  const [needsLocalFiles, setNeedsLocalFiles] = useState(false);
  const [needsBrowserAuth, setNeedsBrowserAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCapsule, setCreatedCapsule] = useState<TaskCapsule | null>(null);

  const riskLevel: RiskLevel = taskTypeMeta[taskType].defaultRisk;
  const canSubmit = goal.trim().length > 0 && !submitting;

  async function submitToBackend(approved = false) {
    setSubmitting(true);
    setError(null);
    try {
      const capsule = await createCapsule({
        goal: goal.trim(),
        taskType,
        riskLevel,
        needsLocalFiles,
        needsBrowserAuth,
        originDeviceType: currentDeviceType,
        originDeviceId: currentDeviceId,
      });
      setCreatedCapsule(capsule);
      // 高风险且未审批 → 停在审批步骤；低风险 → 直接完成
      if ((riskLevel === "high" || riskLevel === "critical") && !approved) {
        setStep("approval");
      } else {
        onDone(capsule);
      }
    } catch (e) {
      setError((e as Error).message);
      setStep("input");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSchedule() {
    if (!canSubmit) return;
    setStep("scheduling");
    // 真实调度在后端完成，这里只做短暂展示
    setTimeout(() => setStep("result"), 800);
  }

  function handleConfirm() {
    if (riskLevel === "high" || riskLevel === "critical") {
      // 先创建胶囊（状态为 waiting），再进入审批步骤
      void submitToBackend(false);
    } else {
      // 低风险直接创建并执行
      void submitToBackend(true);
    }
  }

  function handleApprove() {
    if (!createdCapsule) return;
    // 调用审批接口（通过 store）
    void useOrbitStore.getState().approveCapsule(createdCapsule.id, true).then(() => {
      onDone(createdCapsule);
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶部 */}
      <div className="flex items-center gap-2 border-b border-ink bg-sand-50 px-4 py-3">
        <button onClick={onBack} className="text-ink-mute hover:text-ink">
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <div>
          <div className="mono-label !text-ochre">NEW ORBIT</div>
          <h1 className="font-display text-lg font-semibold leading-tight text-ink">新建任务</h1>
        </div>
        <StepDots step={step} className="ml-auto" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-5 p-4"
            >
              <section>
                <Label n="01" title="任务目标" />
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="帮我整理课程资料，生成复习提纲"
                  rows={2}
                  className="mt-2 w-full resize-none border border-ink bg-sand-50 px-3 py-2.5 font-display text-[15px] text-ink placeholder:text-ink-mute/60 focus:border-ochre focus:outline-none"
                />
              </section>

              <section>
                <Label n="02" title="任务类型" />
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {taskTypeOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setTaskType(opt.type)}
                      className={`border px-2 py-2 text-[11px] font-medium transition-all ${
                        taskType === opt.type
                          ? "border-ink bg-ink text-sand-50"
                          : "border-ink/30 bg-sand-50 text-ink-soft hover:border-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-mute">
                  <span className="mono-label">RISK</span>
                  <span className={`${riskLevel === "critical" ? "text-brick" : riskLevel === "high" ? "text-brick" : riskLevel === "medium" ? "text-amber" : "text-moss"}`}>
                    {riskMeta[riskLevel].label}
                  </span>
                </div>
              </section>

              <section>
                <Label n="03" title="上下文" />
                <div className="mt-2 space-y-1.5">
                  <MiniToggle
                    icon={FileText}
                    label="本地文件"
                    checked={needsLocalFiles}
                    onChange={setNeedsLocalFiles}
                  />
                  <MiniToggle
                    icon={MessageSquare}
                    label="浏览器登录态"
                    checked={needsBrowserAuth}
                    onChange={setNeedsBrowserAuth}
                  />
                </div>
              </section>

              {error && (
                <div className="border border-brick/40 bg-brick/10 px-3 py-2 text-[11px] text-brick">
                  {error}
                </div>
              )}

              <button
                onClick={handleSchedule}
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 border border-ink bg-ink px-4 py-3 text-sm font-semibold text-sand-50 transition-colors enabled:hover:bg-ochre disabled:opacity-40"
              >
                <Sparkles size={14} strokeWidth={2} />
                让调度器选择执行端
              </button>
            </motion.div>
          )}

          {step === "scheduling" && (
            <motion.div
              key="scheduling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center px-4 py-20"
            >
              <Loader2 size={28} className="animate-spin text-ochre" />
              <p className="mt-4 font-display text-lg text-ink">调度器评估中</p>
              <p className="mt-1 text-[11px] text-ink-mute">分析任务类型与设备状态…</p>
            </motion.div>
          )}

          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4 p-4"
            >
              <div className="border-l-2 border-ochre bg-sand-50 px-3 py-2.5">
                <p className="text-[13px] leading-relaxed text-ink">
                  调度器将根据「{taskTypeMeta[taskType].label}」任务类型、设备在线状态与负载，
                  自动选择最合适的执行端。{riskLevel === "high" || riskLevel === "critical" ? "该任务为高风险，创建后需审批。" : "创建后将自动开始执行。"}
                </p>
              </div>

              <div className="border-2 border-ink bg-sand-50 p-3 shadow-structural">
                <div className="mono-label !text-ochre">发起设备</div>
                <div className="mt-2 flex items-center gap-2.5">
                  {(() => {
                    const Icon = deviceIcon[currentDeviceType];
                    return (
                      <div className="flex h-10 w-10 items-center justify-center border border-ink bg-sand-200">
                        <Icon size={18} strokeWidth={1.75} className="text-ink" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="font-display text-base font-semibold text-ink">
                      {deviceTypeMeta[currentDeviceType].label}
                    </div>
                    <div className="text-[10px] text-ink-mute">本机 · 发起端</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("input")}
                  className="border border-ink/40 bg-sand-50 px-3 py-2.5 text-xs font-medium text-ink-soft"
                >
                  修改
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 border border-ink bg-ink px-3 py-2.5 text-xs font-semibold text-sand-50 hover:bg-ochre disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={12} className="mr-1 inline animate-spin" />
                  ) : null}
                  确认创建
                </button>
              </div>

              {(riskLevel === "high" || riskLevel === "critical") && (
                <div className="flex items-center gap-1.5 border border-amber/50 bg-amber/10 px-2.5 py-2 text-[11px] text-ink-soft">
                  <AlertTriangle size={11} className="text-amber" />
                  高风险任务，创建后需手机端审批
                </div>
              )}
            </motion.div>
          )}

          {step === "approval" && (
            <motion.div
              key="approval"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4"
            >
              <div className="border-2 border-ink bg-sand-50 shadow-structural">
                <div className="h-1.5 w-full bg-amber" />
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-ochre" />
                    <span className="font-display text-base font-semibold text-ink">手机端审批</span>
                  </div>
                  <div className="mt-3 border-l-2 border-amber bg-sand-200/50 px-2.5 py-1.5">
                    <span className={`text-[11px] font-semibold ${riskLevel === "critical" ? "text-brick" : "text-amber"}`}>
                      {riskMeta[riskLevel].label} · 需确认
                    </span>
                  </div>
                  <p className="mt-3 font-display text-sm text-ink">{goal}</p>
                  {createdCapsule && (
                    <p className="mt-1 text-[10px] text-ink-mute">
                      胶囊 ID：{createdCapsule.id.toUpperCase()} · 执行端：{deviceTypeMeta[createdCapsule.executionLocation].label}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setStep("result")}
                      className="border border-ink/40 bg-sand-50 px-3 py-2.5 text-xs font-medium text-ink-soft"
                    >
                      返回
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex-1 border border-ink bg-ink px-3 py-2.5 text-xs font-semibold text-sand-50 hover:bg-moss disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 size={12} className="mr-1 inline animate-spin" />
                      ) : (
                        <Check size={12} className="mr-1 inline" strokeWidth={2.5} />
                      )}
                      确认执行
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Label({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-ink/20 pb-1">
      <span className="mono-label !text-ochre">{n}</span>
      <span className="font-display text-sm font-semibold text-ink">{title}</span>
    </div>
  );
}

function StepDots({ step, className }: { step: Step; className?: string }) {
  const steps: Step[] = ["input", "scheduling", "result", "approval"];
  const idx = steps.indexOf(step);
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {steps.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 ${i <= idx ? "bg-ochre" : "bg-ink/20"}`}
        />
      ))}
    </div>
  );
}

function MiniToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof FileText;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between border px-3 py-2 transition-all ${
        checked ? "border-ink bg-ink text-sand-50" : "border-ink/30 bg-sand-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} strokeWidth={1.75} className={checked ? "text-sand-200" : "text-ink-mute"} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`h-3.5 w-6 px-0.5 ${checked ? "bg-ochre" : "bg-ink/20"}`}>
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`h-2.5 w-2.5 bg-sand-50 ${checked ? "ml-auto" : ""}`}
        />
      </div>
    </button>
  );
}
