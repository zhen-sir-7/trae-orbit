import { motion } from "framer-motion";
import {
  Smartphone,
  Cpu,
  HardDrive,
  Cloud,
  Server,
  Wifi,
  Signal,
  Cable,
  Battery,
  BatteryLow,
} from "lucide-react";
import { useOrbitStore } from "@/store/orbit";
import type { DeviceProfile } from "@/types";

const deviceIcon = {
  phone: Smartphone,
  "office-pc": Cpu,
  "home-pc": HardDrive,
  cloud: Cloud,
  nas: Server,
} as const;

export function PhoneDevices() {
  const devices = useOrbitStore((s) => s.devices);
  const toggle = useOrbitStore((s) => s.toggleDeviceOnline);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink bg-sand-50 px-4 py-3">
        <div className="mono-label !text-ochre">DEVICE POOL</div>
        <h1 className="font-display text-lg font-semibold leading-tight text-ink">设备资源池</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {devices.map((d, i) => (
            <PhoneDeviceRow key={d.id} device={d} index={i} onToggle={() => toggle(d.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneDeviceRow({
  device,
  index,
  onToggle,
}: {
  device: DeviceProfile;
  index: number;
  onToggle: () => void;
}) {
  const Icon = deviceIcon[device.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border border-ink bg-sand-50 p-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center border ${
              device.online ? "border-ink bg-sand-200" : "border-ink/30 bg-sand-200/50"
            }`}
          >
            <Icon size={14} strokeWidth={1.75} className={device.online ? "text-ink" : "text-ink-mute"} />
          </div>
          <div>
            <div className="text-xs font-semibold text-ink">{device.name}</div>
            <div className="flex items-center gap-1 text-[9px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${device.online ? "bg-moss" : "bg-ink-mute/50"}`}
              />
              <span className={device.online ? "text-moss" : "text-ink-mute"}>
                {device.online ? "在线" : "离线"}
              </span>
              {device.network && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-ink-mute">
                  <NetIcon network={device.network} />
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`mono-label border px-1.5 py-0.5 ${device.online ? "border-ink/30" : "border-ink/20"}`}
        >
          {device.online ? "ON" : "OFF"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {device.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="border border-ink/20 bg-sand-100 px-1 py-0.5 text-[9px] text-ink-soft"
          >
            {cap}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="flex justify-between text-[8px]">
            <span className="mono-label">LOAD</span>
            <span className="font-mono text-ink">{device.load}%</span>
          </div>
          <div className="mt-0.5 h-1 bg-sand-300">
            <div
              className={`h-full ${device.load > 70 ? "bg-brick" : device.load > 40 ? "bg-amber" : "bg-moss"}`}
              style={{ width: `${device.load}%` }}
            />
          </div>
        </div>
        <div>
          {device.battery !== undefined ? (
            <>
              <div className="flex justify-between text-[8px]">
                <span className="mono-label">BAT</span>
                <span className="font-mono text-ink">{device.battery}%</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <div className="h-1 flex-1 bg-sand-300">
                  <div
                    className={`h-full ${device.battery < 20 ? "bg-brick" : "bg-moss"}`}
                    style={{ width: `${device.battery}%` }}
                  />
                </div>
                {device.battery < 20 ? (
                  <BatteryLow size={9} className="text-brick" />
                ) : (
                  <Battery size={9} className="text-moss" />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-[8px]">
                <span className="mono-label">PWR</span>
                <span className="font-mono text-ink">AC</span>
              </div>
              <div className="mt-0.5 h-1 w-full bg-moss/30">
                <div className="h-full w-full bg-moss" />
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NetIcon({ network }: { network: "wifi" | "cellular" | "ethernet" }) {
  if (network === "wifi") return <Wifi size={9} />;
  if (network === "cellular") return <Signal size={9} />;
  return <Cable size={9} />;
}
