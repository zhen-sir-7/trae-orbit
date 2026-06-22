import { motion } from "framer-motion";
import {
  Battery,
  BatteryLow,
  Cpu,
  HardDrive,
  Cloud,
  Server,
  Smartphone,
  Wifi,
  Signal,
  Cable,
} from "lucide-react";
import type { DeviceProfile } from "@/types";
import { deviceTypeMeta } from "@/lib/meta";
import { useOrbitStore } from "@/store/orbit";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

export function DevicePool() {
  const devices = useOrbitStore((s) => s.devices);
  const toggle = useOrbitStore((s) => s.toggleDeviceOnline);

  return (
    <section className="surface">
      <header className="flex items-center justify-between border-b border-ink px-5 py-4">
        <div>
          <div className="mono-label">DEVICE POOL</div>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">设备资源池</h2>
        </div>
        <span className="mono-label !text-ink">{devices.filter((d) => d.online).length} ONLINE</span>
      </header>

      <ul className="divide-y divide-ink/15">
        {devices.map((d, i) => (
          <DeviceRow key={d.id} device={d} index={i} onToggle={() => toggle(d.id)} />
        ))}
      </ul>
    </section>
  );
}

function DeviceRow({
  device,
  index,
  onToggle,
}: {
  device: DeviceProfile;
  index: number;
  onToggle: () => void;
}) {
  const meta = deviceTypeMeta[device.type];
  const Icon = deviceIcon[device.type];

  return (
    <motion.li
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.06 }}
      className="px-5 py-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center border ${
              device.online ? "border-ink bg-sand-200" : "border-ink/30 bg-sand-200/50"
            }`}
          >
            <Icon size={15} strokeWidth={1.75} className={device.online ? "text-ink" : "text-ink-mute"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{device.name}</span>
              <span className="mono-label">{meta.abbr}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${device.online ? "bg-moss" : "bg-ink-mute/50"}`}
              />
              <span className={device.online ? "text-moss" : "text-ink-mute"}>
                {device.online ? "在线" : "离线"}
              </span>
              {device.network && (
                <span className="ml-1 inline-flex items-center gap-1 text-ink-mute">
                  <NetworkIcon network={device.network} />
                  {device.network.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="mono-label border border-ink/30 px-2 py-1 transition-colors hover:border-ink hover:bg-ink hover:text-sand-50"
          title="切换在线状态（演示用）"
        >
          {device.online ? "ON" : "OFF"}
        </button>
      </div>

      {/* 能力标签 */}
      <div className="mt-3 flex flex-wrap gap-1">
        {device.capabilities.map((cap) => (
          <span
            key={cap}
            className="border border-ink/20 bg-sand-100 px-1.5 py-0.5 text-[10px] text-ink-soft"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* 负载 + 电量 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="mono-label">LOAD</span>
            <span className="font-mono text-ink">{device.load}%</span>
          </div>
          <div className="mt-1 h-1 w-full bg-sand-300">
            <div
              className={`h-full ${device.load > 70 ? "bg-brick" : device.load > 40 ? "bg-amber" : "bg-moss"}`}
              style={{ width: `${device.load}%` }}
            />
          </div>
        </div>
        <div>
          {device.battery !== undefined ? (
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="mono-label">BATTERY</span>
                <span className="font-mono text-ink">{device.battery}%</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <div className="h-1 flex-1 bg-sand-300">
                  <div
                    className={`h-full ${device.battery < 20 ? "bg-brick" : "bg-moss"}`}
                    style={{ width: `${device.battery}%` }}
                  />
                </div>
                {device.battery < 20 ? (
                  <BatteryLow size={11} className="text-brick" />
                ) : (
                  <Battery size={11} className="text-moss" />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="mono-label">POWER</span>
                <span className="font-mono text-ink">AC</span>
              </div>
              <div className="mt-1 h-1 w-full bg-moss/30">
                <div className="h-full w-full bg-moss" />
              </div>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function NetworkIcon({ network }: { network: "wifi" | "cellular" | "ethernet" }) {
  if (network === "wifi") return <Wifi size={10} />;
  if (network === "cellular") return <Signal size={10} />;
  return <Cable size={10} />;
}
