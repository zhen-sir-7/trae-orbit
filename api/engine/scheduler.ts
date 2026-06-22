import type {
  DeviceRecord,
  DeviceType,
  SchedulingInput,
  SchedulingResult,
  TaskType,
} from "@shared/types";

const deviceTypeLabel: Record<DeviceType, string> = {
  phone: "手机",
  "office-pc": "办公电脑",
  "home-pc": "家用电脑",
  cloud: "云端",
  nas: "NAS",
};

// 任务类型 → 偏好执行端优先级
const preference: Record<TaskType, DeviceType[]> = {
  qa: ["phone", "cloud", "home-pc", "office-pc", "nas"],
  "file-analysis": ["cloud", "office-pc", "home-pc", "phone", "nas"],
  code: ["office-pc", "home-pc", "cloud", "phone", "nas"],
  bulk: ["cloud", "home-pc", "office-pc", "nas", "phone"],
  "browser-auth": ["office-pc", "home-pc", "phone", "cloud", "nas"],
  "high-risk": ["office-pc", "home-pc", "cloud", "phone", "nas"],
};

function reasonFor(taskType: TaskType, device: DeviceType): string {
  const map: Record<string, string> = {
    "qa|phone": "轻量问答适合手机本地处理，响应即时且无需上传。",
    "qa|cloud": "任务可由轻量云端快速完成，不占用本地资源。",
    "file-analysis|cloud": "大文件分析需要稳定算力，云端处理更快。",
    "file-analysis|office-pc": "需要访问本地文件，办公电脑可直接读取。",
    "code|office-pc": "代码修改需要本地依赖与构建环境，办公电脑已就绪。",
    "code|home-pc": "家用电脑算力闲置，适合长时间构建与测试。",
    "bulk|cloud": "批量大文件处理需要高算力与带宽，云端最合适。",
    "bulk|home-pc": "家用电脑闲置算力可承担批量任务，且不占用工作设备。",
    "browser-auth|office-pc": "需要浏览器登录态，仅已登录的本地设备可用。",
    "browser-auth|home-pc": "本地设备已登录所需账号，可执行浏览器操作。",
    "high-risk|office-pc": "高风险操作优先在受控本地设备执行，便于审计。",
  };
  return map[`${taskType}|${device}`] ?? "根据任务类型与设备状态综合评估。";
}

function notRecommendedReason(
  taskType: TaskType,
  device: DeviceType,
  d: DeviceRecord
): string {
  if (!d.online) return `${deviceTypeLabel[d.type]} 当前离线，无法执行任务。`;
  if (taskType === "browser-auth" && (device === "cloud" || device === "nas"))
    return "云端 / NAS 无法访问用户的浏览器登录态。";
  if (taskType === "file-analysis" && device === "phone")
    return "手机处理大文件较慢，且消耗电量。";
  if (taskType === "code" && device === "phone")
    return "手机不适合执行代码修改与构建。";
  if (taskType === "bulk" && device === "phone")
    return "批量大文件任务会快速耗尽手机电量与流量。";
  if (taskType === "qa" && device === "nas")
    return "NAS 不适合执行交互式问答。";
  if (d.load > 80) return `${deviceTypeLabel[d.type]} 当前负载较高，可能影响任务速度。`;
  return "相对推荐端，该设备并非最优选择。";
}

export function scheduleTask(
  input: SchedulingInput,
  devices: DeviceRecord[]
): SchedulingResult {
  const { taskType } = input;
  const order = preference[taskType];

  const online = devices.filter((d) => d.online);
  const sorted = [...online].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
  );

  const recommendedDevice = sorted[0];
  const alternatives = sorted.slice(1, 3);
  const notRecommended = devices
    .filter(
      (d) =>
        d.id !== recommendedDevice?.id && !alternatives.some((a) => a.id === d.id)
    )
    .map((device) => ({
      device,
      reason: notRecommendedReason(taskType, device.type, device),
    }));

  const reason = recommendedDevice
    ? `${reasonFor(taskType, recommendedDevice.type)}${
        recommendedDevice.load > 70
          ? ` 注意：${deviceTypeLabel[recommendedDevice.type]} 当前负载 ${recommendedDevice.load}%，可能稍慢。`
          : ""
      }`
    : "当前没有在线设备可执行该任务。";

  return {
    recommendedDeviceType: recommendedDevice?.type ?? "cloud",
    recommendedDevice,
    reason,
    alternatives,
    notRecommended,
  };
}
