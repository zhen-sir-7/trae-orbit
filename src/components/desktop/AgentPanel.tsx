import { motion } from "framer-motion";
import { Plug, Plug2, Check, Loader2, AlertCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { useOrbitStore } from "@/store/orbit";
import { agentKindMeta, agentStatusMeta } from "@/lib/meta";
import type { AgentRecord } from "@/types";

export function AgentPanel() {
  const agents = useOrbitStore((s) => s.agents);
  const toggle = useOrbitStore((s) => s.toggleAgent);
  const createAgent = useOrbitStore((s) => s.createAgent);
  const [showCreate, setShowCreate] = useState(false);
  const connected = agents.filter((a) => a.connected).length;

  return (
    <section className="border-b border-ink/15">
      <header className="flex items-center justify-between border-b border-ink/20 bg-sand-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Plug2 size={13} className="text-ochre" strokeWidth={1.75} />
          <span className="font-display text-sm font-semibold text-ink">AI 执行后端</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-label !text-ink">{connected}/{agents.length} 已连接</span>
          <button
            onClick={() => setShowCreate(true)}
            title="添加自定义 Agent"
            className="flex items-center gap-1 border border-ink/30 bg-sand-50 px-1.5 py-0.5 text-[9px] text-ink-mute hover:border-ink hover:text-ink"
          >
            <Plus size={9} strokeWidth={2} />
            自定义
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-0">
        {agents.map((a, i) => (
          <AgentCard key={a.id} agent={a} index={i} total={agents.length} onToggle={() => toggle(a.id)} />
        ))}
        {agents.length === 0 && (
          <div className="col-span-2 px-4 py-6 text-center text-xs text-ink-mute">
            暂无 Agent，点击「自定义」添加
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAgentDialog
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            await createAgent(input);
            setShowCreate(false);
          }}
        />
      )}
    </section>
  );
}

function AgentCard({
  agent,
  index,
  total,
  onToggle,
}: {
  agent: AgentRecord;
  index: number;
  total: number;
  onToggle: () => void;
}) {
  const meta = agentKindMeta[agent.kind];
  const status = agentStatusMeta[agent.status];
  const isRightCol = index % 2 === 1;
  const isLastRow = index >= total - (total % 2 === 0 ? 2 : 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`relative border-b border-r border-ink/15 p-3 ${
        isRightCol ? "border-r-0" : ""
      } ${isLastRow ? "border-b-0" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center border font-mono text-[10px] font-bold"
            style={{
              borderColor: agent.connected ? meta.color : "#1A1A1A30",
              color: agent.connected ? meta.color : "#6B6B66",
              backgroundColor: agent.connected ? `${meta.color}15` : "transparent",
            }}
          >
            {agent.abbr}
          </div>
          <div>
            <div className="text-xs font-semibold text-ink">{agent.name}</div>
            <div className="mono-label">{agent.version}{agent.builtIn ? " · 内置" : " · 自定义"}</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
            agent.connected
              ? "border-moss/50 bg-moss/10 text-moss hover:bg-moss/20"
              : "border-ink/30 bg-sand-100 text-ink-mute hover:border-ink"
          }`}
        >
          <Plug size={9} strokeWidth={2} />
          {agent.connected ? "已接入" : "接入"}
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
        <span className={`text-[10px] font-medium ${status.text}`}>{status.label}</span>
        {agent.currentTaskId && (
          <span className="ml-1 truncate text-[10px] text-ink-mute">· {agent.currentTaskId}</span>
        )}
      </div>

      {/* 状态指示条 */}
      <div className="mt-2 flex gap-0.5">
        {Array.from({ length: 6 }).map((_, k) => (
          <div
            key={k}
            className="h-1 flex-1"
            style={{
              backgroundColor:
                agent.status === "busy" && k < 4
                  ? meta.color
                  : agent.status === "idle" && k < 1
                  ? "#5C6B4A"
                  : "#1A1A1A15",
            }}
          />
        ))}
      </div>

      {agent.status === "busy" && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-moss">
          <Loader2 size={9} className="animate-spin" />
          <span>正在执行任务…</span>
        </div>
      )}
      {agent.status === "error" && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-brick">
          <AlertCircle size={9} />
          <span>执行异常，需检查</span>
        </div>
      )}
      {agent.status === "idle" && agent.connected && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-mute">
          <Check size={9} />
          <span>就绪，可接收任务</span>
        </div>
      )}
    </motion.div>
  );
}

function CreateAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    abbr: string;
    command: string;
    args?: string;
    workdir?: string;
    capabilities?: string[];
    version?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("{goal}");
  const [workdir, setWorkdir] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !command.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        abbr: abbr.trim() || name.slice(0, 2).toUpperCase(),
        command: command.trim(),
        args: args.trim() || undefined,
        workdir: workdir.trim() || undefined,
        version: "custom",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border-2 border-ink bg-sand-50 shadow-structural"
      >
        <div className="flex items-center justify-between border-b border-ink bg-sand-100 px-4 py-3">
          <div>
            <div className="mono-label !text-ochre">CUSTOM AGENT</div>
            <h3 className="font-display text-base font-semibold text-ink">添加自定义 Agent</h3>
          </div>
          <button onClick={onClose} className="text-ink-mute hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="mono-label">名称</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Agent"
                className="mt-1 w-full border border-ink bg-sand-200/40 px-2 py-1.5 text-xs text-ink focus:border-ochre focus:outline-none"
              />
            </div>
            <div>
              <label className="mono-label">缩写</label>
              <input
                value={abbr}
                onChange={(e) => setAbbr(e.target.value)}
                placeholder="MA"
                maxLength={4}
                className="mt-1 w-full border border-ink bg-sand-200/40 px-2 py-1.5 text-xs text-ink focus:border-ochre focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mono-label">命令（可执行文件）</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="my-agent"
              className="mt-1 w-full border border-ink bg-sand-200/40 px-2 py-1.5 font-mono text-xs text-ink focus:border-ochre focus:outline-none"
            />
          </div>

          <div>
            <label className="mono-label">参数模板（{"{goal}"} 会被替换为任务目标）</label>
            <input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="{goal}"
              className="mt-1 w-full border border-ink bg-sand-200/40 px-2 py-1.5 font-mono text-xs text-ink focus:border-ochre focus:outline-none"
            />
          </div>

          <div>
            <label className="mono-label">工作目录（可选）</label>
            <input
              value={workdir}
              onChange={(e) => setWorkdir(e.target.value)}
              placeholder="C:\\project"
              className="mt-1 w-full border border-ink bg-sand-200/40 px-2 py-1.5 font-mono text-xs text-ink focus:border-ochre focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="border border-ink/40 bg-sand-50 px-3 py-2 text-xs font-medium text-ink-soft"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !command.trim() || submitting}
              className="flex-1 border border-ink bg-ink px-3 py-2 text-xs font-semibold text-sand-50 hover:bg-ochre disabled:opacity-50"
            >
              {submitting ? "创建中…" : "创建"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
