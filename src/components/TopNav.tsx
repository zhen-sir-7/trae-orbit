import { NavLink } from "react-router-dom";
import { Radio } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { useOrbitStore } from "@/store/orbit";

export function TopNav() {
  const devices = useOrbitStore((s) => s.devices);
  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-sand-200/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/" label="执行端" />
            <NavItem to="/console" label="控制台" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 border border-ink/40 bg-sand-50 px-3 py-1.5 sm:flex">
            <Radio size={12} className={onlineCount > 0 ? "text-moss" : "text-brick"} />
            <span className="mono-label !text-ink">
              {onlineCount}/{devices.length} 设备在线
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "border-ochre text-ink"
            : "border-transparent text-ink-mute hover:text-ink",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
