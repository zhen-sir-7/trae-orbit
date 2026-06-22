import { Outlet } from "react-router-dom";
import { TopNav } from "@/components/TopNav";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink bg-sand-200">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-6 py-8 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <span className="mono-label !text-ink">TRAE ORBIT</span>
          <span className="text-ink-mute">·</span>
          <span>AI 随人走，算力随任务动</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="mono-label">MVP · DEMO 2026</span>
          <span className="mono-label">STRUCTURALIST EDITION</span>
        </div>
      </div>
    </footer>
  );
}
