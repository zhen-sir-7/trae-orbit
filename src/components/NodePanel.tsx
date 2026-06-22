import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Wifi, WifiOff, Globe } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";

export function NodePanel() {
  const nodes = useOrbitStore((s) => s.nodes);
  const addNode = useOrbitStore((s) => s.addNode);
  const deleteNode = useOrbitStore((s) => s.deleteNode);
  const [showAdd, setShowAdd] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8787");
  const [name, setName] = useState("");

  const onlineCount = nodes.filter((n) => n.online).length;

  const handleAdd = async () => {
    if (!host || !port) return;
    await addNode(host, Number(port), name || undefined);
    setHost("");
    setPort("8787");
    setName("");
    setShowAdd(false);
  };

  return (
    <section className="surface">
      <header className="flex items-center justify-between border-b border-ink px-5 py-4">
        <div>
          <div className="mono-label">FEDERATED NODES</div>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">联邦节点</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono-label !text-ink">{onlineCount} ONLINE</span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 border border-ink/30 px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-sand-200"
          >
            <Plus size={12} />
            添加
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-ink/15 bg-sand-200/40"
          >
            <div className="grid grid-cols-[1fr_80px_1fr_auto] gap-2 px-5 py-3">
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="IP / 主机名"
                className="border border-ink/30 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-ochre"
              />
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="端口"
                className="border border-ink/30 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-ochre"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名称（可选）"
                className="border border-ink/30 bg-sand-50 px-3 py-1.5 text-sm text-ink outline-none focus:border-ochre"
              />
              <button
                onClick={handleAdd}
                className="border border-ink bg-ink px-4 py-1.5 text-xs font-semibold text-sand-50 transition-colors hover:bg-ochre"
              >
                连接
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="divide-y divide-ink/15">
        {nodes.map((node) => (
          <li key={node.id} className="flex items-center gap-3 px-5 py-3">
            <div className={`flex h-8 w-8 items-center justify-center border ${node.online ? "border-ochre/40 bg-ochre/10" : "border-ink/20 bg-sand-200/40"}`}>
              {node.online ? (
                <Wifi size={14} className="text-ochre" />
              ) : (
                <WifiOff size={14} className="text-ink-mute" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">{node.name}</span>
                {node.isSelf && (
                  <span className="mono-label !text-[10px] !text-ochre">本机</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-mute">
                <Globe size={10} />
                <span className="mono-label !text-[10px]">{node.host}:{node.port}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 ${node.online ? "bg-ochre" : "bg-ink/20"}`} />
              <span className="mono-label !text-[10px]">
                {node.online ? "ONLINE" : "OFFLINE"}
              </span>
              {!node.isSelf && (
                <button
                  onClick={() => deleteNode(node.id)}
                  className="text-ink-mute transition-colors hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </li>
        ))}
        {nodes.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-ink-mute">
            暂无节点信息
          </li>
        )}
      </ul>

      <footer className="border-t border-ink/15 px-5 py-3">
        <p className="text-xs text-ink-mute">
          局域网节点自动发现（mDNS），远程节点可手动添加。任务在节点间自动同步，任意节点可执行。
        </p>
      </footer>
    </section>
  );
}
