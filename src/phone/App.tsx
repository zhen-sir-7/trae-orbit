import { useEffect, useState } from "react";
import { HashRouter as Router } from "react-router-dom";
import { Settings } from "lucide-react";
import { OrbitLogo } from "@/components/Logo";
import { PhoneApp } from "@/components/phone/PhoneApp";
import { useOrbitStore } from "@/store/orbit";
import { getApiBase, setApiBase } from "@/lib/api";

// 移动端 App：独立入口，全屏手机体验（去除登录系统，直接进入）
export default function App() {
  return (
    <Router>
      <PhoneShell />
    </Router>
  );
}

function PhoneShell() {
  const init = useOrbitStore((s) => s.init);
  const initialized = useOrbitStore((s) => s.initialized);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  return (
    <div className="flex h-[100dvh] flex-col bg-sand-200">
      {/* 全局顶栏：Logo + 后端设置 */}
      <header className="flex shrink-0 items-center justify-between border-b border-ink/15 bg-sand-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <OrbitLogo size={20} />
          <span className="font-display text-sm font-semibold tracking-tight text-ink">
            TRAE Orbit
          </span>
          <span className="mono-label !text-ochre">PHONE</span>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="后端地址设置"
          className="flex items-center justify-center text-ink-mute transition-colors hover:text-ochre"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </header>

      {/* 主内容：PhoneApp 填满剩余高度 */}
      <div className="flex-1 overflow-hidden">
        <PhoneApp />
      </div>

      {/* 后端地址设置浮层 */}
      {showSettings && (
        <BackendSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function BackendSettings({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState(getApiBase());

  function handleSave() {
    setApiBase(value.trim());
    onClose();
    // 刷新以应用新的 API 基址
    location.reload();
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-[320px] border-2 border-ink bg-sand-50 p-4 shadow-structural">
        <div className="mono-label !text-ochre">BACKEND</div>
        <h3 className="mt-1 font-display text-base font-semibold text-ink">后端节点地址</h3>
        <p className="mt-1 text-[11px] text-ink-mute">
          填写电脑端节点的地址（含端口），留空则使用同源默认。
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="http://192.168.1.100:8787"
          className="mt-3 w-full border border-ink bg-sand-200/40 px-3 py-2 font-mono text-xs text-ink focus:border-ochre focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 border border-ink bg-ink py-2 text-xs font-semibold text-sand-50 hover:bg-ochre"
          >
            保存并刷新
          </button>
          <button
            onClick={onClose}
            className="border border-ink/30 px-3 py-2 text-xs text-ink-mute hover:border-ink hover:text-ink"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
