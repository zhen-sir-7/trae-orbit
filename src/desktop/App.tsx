import { useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { DesktopExecutor } from "@/components/desktop/DesktopExecutor";
import Home from "@/pages/Home";
import CapsuleDetail from "@/pages/CapsuleDetail";
import { useOrbitStore } from "@/store/orbit";

// 电脑端 App：独立入口，桌面执行端 + 控制台（去除登录系统，直接进入）
export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          element={
            <DesktopLayout />
          }
        >
          <Route path="/" element={<ExecutorRoute />} />
          <Route path="/console" element={<ConsoleRoute />} />
          <Route path="/capsule/:id" element={<DetailRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function DesktopLayout() {
  const init = useOrbitStore((s) => s.init);
  const initialized = useOrbitStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

// 执行端：固定高度，内部日志区滚动
function ExecutorRoute() {
  return (
    <div className="h-[calc(100dvh-64px)]">
      <DesktopExecutor />
    </div>
  );
}

// 控制台：整页滚动
function ConsoleRoute() {
  return (
    <div className="h-[calc(100dvh-64px)] overflow-y-auto">
      <Home />
    </div>
  );
}

// 胶囊详情：整页滚动
function DetailRoute() {
  return (
    <div className="h-[calc(100dvh-64px)] overflow-y-auto">
      <CapsuleDetail />
    </div>
  );
}
