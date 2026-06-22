import { create } from "zustand";
import type { AgentRecord, DeviceRecord, LogLine, NodeRecord, TaskCapsule } from "@/types";
import { api, wsClient } from "@/lib/api";
import type { WSMessage } from "@shared/types";

// 当前设备标识（浏览器内固定，用于心跳与发起任务时上报）
const DEVICE_ID_KEY = "orbit_device_id";
const DEVICE_TYPE_KEY = "orbit_device_type";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export const currentDeviceId = getOrCreateDeviceId();

// 设备类型：根据 UA 简单判定（手机 / 办公电脑）
function detectDeviceType(): DeviceRecord["type"] {
  if (typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    return "phone";
  }
  return "office-pc";
}

export const currentDeviceType: DeviceRecord["type"] =
  (localStorage.getItem(DEVICE_TYPE_KEY) as DeviceRecord["type"]) || detectDeviceType();
localStorage.setItem(DEVICE_TYPE_KEY, currentDeviceType);

interface OrbitState {
  // 数据
  capsules: TaskCapsule[];
  devices: DeviceRecord[];
  agents: AgentRecord[];
  nodes: NodeRecord[]; // 联邦节点
  logs: LogLine[]; // 全局日志（聚合所有胶囊的最新日志）
  selectedCapsuleId: string | null;

  // 状态
  initialized: boolean;
  loading: boolean;
  error: string | null;

  // 操作
  init: () => Promise<void>;
  refreshCapsules: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshAgents: () => Promise<void>;
  refreshNodes: () => Promise<void>;
  selectCapsule: (id: string | null) => void;

  // 胶囊操作
  createCapsule: (input: Parameters<typeof api.createCapsule>[0]) => Promise<TaskCapsule>;
  approveCapsule: (id: string, approved: boolean) => Promise<void>;
  executeCapsule: (id: string, agentId: string, workdir?: string) => Promise<void>;

  // 设备操作
  registerCurrentDevice: (name?: string) => Promise<DeviceRecord | null>;
  toggleDeviceOnline: (id: string) => Promise<void>;

  // Agent 操作
  toggleAgent: (id: string) => Promise<void>;
  createAgent: (input: Parameters<typeof api.createAgent>[0]) => Promise<void>;

  // 节点操作
  addNode: (host: string, port: number, name?: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;

  // 上下文导入/导出（打通不同工具）
  exportCapsules: (ids?: string[]) => Promise<unknown>;
  importCapsules: (bundle: unknown) => Promise<{ imported: number; ids: string[] }>;
  importOpenCode: (opencodePath?: string) => Promise<void>;

  // 日志
  appendLog: (line: LogLine) => void;

  // 内部：处理 WS 消息
  handleWS: (msg: WSMessage) => Promise<void>;
}

export const useOrbitStore = create<OrbitState>((set, get) => ({
  capsules: [],
  devices: [],
  agents: [],
  nodes: [],
  logs: [],
  selectedCapsuleId: null,
  initialized: false,
  loading: false,
  error: null,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true, error: null });
    try {
      const [capsules, devices, agents, nodes] = await Promise.all([
        api.listCapsules(),
        api.listDevices(),
        api.listAgents(),
        api.listNodes(),
      ]);
      set({ capsules, devices, agents, nodes, loading: false, initialized: true });

      // 连接 WebSocket
      wsClient.connect();
      wsClient.on((msg) => get().handleWS(msg));
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  refreshCapsules: async () => {
    try {
      const capsules = await api.listCapsules();
      set({ capsules });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshDevices: async () => {
    try {
      const devices = await api.listDevices();
      set({ devices });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshAgents: async () => {
    try {
      const agents = await api.listAgents();
      set({ agents });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshNodes: async () => {
    try {
      const nodes = await api.listNodes();
      set({ nodes });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  selectCapsule: (id) => set({ selectedCapsuleId: id }),

  createCapsule: async (input) => {
    const capsule = await api.createCapsule(input);
    set((s) => ({ capsules: [capsule, ...s.capsules] }));
    return capsule;
  },

  approveCapsule: async (id, approved) => {
    const updated = await api.approveCapsule(id, approved);
    set((s) => ({
      capsules: s.capsules.map((c) => (c.id === id ? updated : c)),
    }));
  },

  executeCapsule: async (id, agentId, workdir) => {
    await api.executeCapsule(id, agentId, workdir);
    // 实际进度通过 WS 推送
  },

  registerCurrentDevice: async (name) => {
    try {
      const device = await api.registerDevice({
        name: name ?? (currentDeviceType === "phone" ? "我的手机" : "办公电脑"),
        type: currentDeviceType,
        capabilities:
          currentDeviceType === "phone" ? ["移动办公", "审批"] : ["高算力", "本地文件", "代码执行"],
        network: currentDeviceType === "phone" ? "wifi" : "ethernet",
      });
      // 若返回的 id 与本地缓存不同，更新缓存
      if (device.id !== currentDeviceId) {
        localStorage.setItem(DEVICE_ID_KEY, device.id);
      }
      await get().refreshDevices();
      return device;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  toggleDeviceOnline: async (id) => {
    const device = get().devices.find((d) => d.id === id);
    if (!device) return;
    if (device.online) {
      await api.setDeviceOffline(id);
    } else {
      await api.heartbeat(id);
    }
    await get().refreshDevices();
  },

  toggleAgent: async (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) return;
    await api.updateAgent(id, { connected: !agent.connected });
    await get().refreshAgents();
  },

  createAgent: async (input) => {
    await api.createAgent(input);
    await get().refreshAgents();
  },

  addNode: async (host, port, name) => {
    await api.addNode(host, port, name);
    await get().refreshNodes();
  },

  deleteNode: async (id) => {
    await api.deleteNode(id);
    await get().refreshNodes();
  },

  exportCapsules: async (ids) => {
    return await api.exportCapsules(ids);
  },

  importCapsules: async (bundle) => {
    const result = await api.importCapsules(bundle);
    await get().refreshCapsules();
    return result;
  },

  importOpenCode: async (opencodePath) => {
    await api.importOpenCode(opencodePath);
    await get().refreshCapsules();
  },

  appendLog: (line) =>
    set((s) => ({ logs: [line, ...s.logs].slice(0, 100) })),

  handleWS: async (msg) => {
    switch (msg.type) {
      case "capsule:update": {
        // 重新拉取该胶囊详情，并刷新列表
        const capsuleId = msg.capsuleId;
        api.getCapsule(capsuleId).then((capsule) => {
          set((s) => {
            const exists = s.capsules.some((c) => c.id === capsuleId);
            return {
              capsules: exists
                ? s.capsules.map((c) => (c.id === capsuleId ? capsule : c))
                : [capsule, ...s.capsules],
              // 同时更新该胶囊的日志到全局日志
              logs: mergeLogs(s.logs, capsule.logs),
            };
          });
        }).catch(() => {});
        break;
      }
      case "log:append": {
        const log = msg.log;
        set((s) => ({ logs: [log, ...s.logs].slice(0, 100) }));
        break;
      }
      case "approval:request":
      case "approval:result":
      case "device:status": {
        // 刷新对应数据
        get().refreshDevices();
        get().refreshCapsules();
        get().refreshAgents();
        break;
      }
      case "node:list": {
        set({ nodes: msg.nodes });
        break;
      }
      case "capsules:imported": {
        await get().refreshCapsules();
        break;
      }
      case "heartbeat":
      case "subscribe":
        break;
    }
  },
}));

function mergeLogs(existing: LogLine[], incoming: LogLine[]): LogLine[] {
  const ids = new Set(existing.map((l) => l.id));
  const fresh = incoming.filter((l) => !ids.has(l.id));
  return [...fresh.reverse(), ...existing].slice(0, 100);
}

export function logout() {
  wsClient.disconnect();
  useOrbitStore.setState({
    capsules: [],
    devices: [],
    agents: [],
    nodes: [],
    logs: [],
    initialized: false,
    selectedCapsuleId: null,
  });
}
