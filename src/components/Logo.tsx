import { Link } from "react-router-dom";

// TRAE Orbit 几何 Logo：环形 + 中心赭石节点 + 四向节点
export function OrbitLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="32" cy="32" r="22" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="32" cy="32" r="6" fill="#B85C38" />
      <circle cx="32" cy="10" r="3" fill="#1A1A1A" />
      <circle cx="54" cy="32" r="3" fill="#1A1A1A" />
      <circle cx="32" cy="54" r="3" fill="#1A1A1A" />
      <circle cx="10" cy="32" r="3" fill="#1A1A1A" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="group flex items-center gap-3">
      <OrbitLogo size={34} />
      <div className="leading-none">
        <div className="font-display text-[20px] font-semibold tracking-tightest text-ink">
          TRAE Orbit
        </div>
        <div className="mono-label mt-1">AI · FOLLOWS · YOU</div>
      </div>
    </Link>
  );
}
