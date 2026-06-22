import { useState, useRef } from "react";
import { Download, Upload, GitMerge, X, CheckCircle, AlertCircle } from "lucide-react";
import { useOrbitStore } from "@/store/orbit";

export function ContextBridge() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "import-file" | "import-opencode" | "export">("menu");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [customPath, setCustomPath] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { exportCapsules, importCapsules, importOpenCode } = useOrbitStore();

  const handleExportAll = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const bundle = await exportCapsules() as any;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-context-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: `已导出 ${bundle.capsules?.length ?? 0} 个胶囊` });
    } catch (e) {
      setMessage({ type: "error", text: `导出失败: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setLoading(true);
    setMessage(null);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const result = await importCapsules(bundle);
      setMessage({ type: "success", text: `成功导入 ${result.imported} 个胶囊` });
    } catch (e) {
      setMessage({ type: "error", text: `导入失败: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImportOpenCode = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await importOpenCode(customPath || undefined);
      setMessage({ type: "success", text: "已从 OpenCode workspace 导入上下文" });
      setMode("menu");
    } catch (e) {
      setMessage({ type: "error", text: `导入失败: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 border border-ink/40 bg-sand-50 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-sand-200"
        title="导入/导出上下文，打通不同工具"
      >
        <GitMerge size={13} />
        导入导出
      </button>

      {/* 模态框 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md border border-ink bg-sand-50 shadow-xl">
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-ink px-5 py-3">
              <span className="font-display text-base font-semibold text-ink">上下文导入 / 导出</span>
              <button onClick={() => { setOpen(false); setMode("menu"); setMessage(null); }} className="text-ink-mute hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-5">
              {message && (
                <div className={`mb-4 flex items-center gap-2 px-3 py-2 text-sm ${message.type === "success" ? "bg-moss/10 text-moss" : "bg-brick/10 text-brick"}`}>
                  {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {message.text}
                </div>
              )}

              {mode === "menu" && (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">打通不同 AI 工具的工作上下文，在 TRAE Orbit 和 OpenCode 之间传递任务历史。</p>
                  <button
                    onClick={handleExportAll}
                    disabled={loading}
                    className="flex w-full items-center gap-3 border border-ink/30 bg-sand-100 px-4 py-3 text-left text-sm text-ink transition-colors hover:border-ink hover:bg-sand-200 disabled:opacity-50"
                  >
                    <Download size={16} />
                    <div>
                      <div className="font-medium">导出为 JSON</div>
                      <div className="text-xs text-ink-mute">将所有胶囊导出为标准上下文包，可在其他工具中导入</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("import-file")}
                    disabled={loading}
                    className="flex w-full items-center gap-3 border border-ink/30 bg-sand-100 px-4 py-3 text-left text-sm text-ink transition-colors hover:border-ink hover:bg-sand-200 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    <div>
                      <div className="font-medium">从 JSON 导入</div>
                      <div className="text-xs text-ink-mute">导入其他工具导出的上下文包</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("import-opencode")}
                    disabled={loading}
                    className="flex w-full items-center gap-3 border border-ink/30 bg-sand-100 px-4 py-3 text-left text-sm text-ink transition-colors hover:border-ink hover:bg-sand-200 disabled:opacity-50"
                  >
                    <GitMerge size={16} />
                    <div>
                      <div className="font-medium">导入 OpenCode 工作区</div>
                      <div className="text-xs text-ink-mute">读取 ~/.opencode/workspace/ 中的身份、技能配置</div>
                    </div>
                  </button>
                </div>
              )}

              {mode === "import-file" && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-soft">选择导出的 JSON 上下文包文件（.json）</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={loading}
                    className="w-full border border-ink bg-sand-100 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-sand-200 disabled:opacity-50"
                  >
                    {loading ? "导入中..." : "选择文件"}
                  </button>
                  <button onClick={() => setMode("menu")} className="w-full text-sm text-ink-mute hover:text-ink">
                    返回
                  </button>
                </div>
              )}

              {mode === "import-opencode" && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-soft">
                    读取 OpenCode workspace 中的 IDENTITY.md、SKILLS.md、SOUL.md 作为任务胶囊上下文。
                    <br />
                    默认路径: <code className="text-xs">C:\Users\zhen1\.opencode\workspace</code>
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-mute">自定义 OpenCode 路径（可选）</label>
                    <input
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder="留空使用默认路径"
                      className="w-full border border-ink/30 bg-sand-100 px-3 py-2 text-sm text-ink placeholder:text-ink-mute/50 focus:border-ink focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleImportOpenCode}
                    disabled={loading}
                    className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-ochre disabled:opacity-50"
                  >
                    {loading ? "导入中..." : "从 OpenCode 导入"}
                  </button>
                  <button onClick={() => setMode("menu")} className="w-full text-sm text-ink-mute hover:text-ink">
                    返回
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
