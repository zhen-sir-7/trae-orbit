// TRAE Orbit API 客户端：封装所有后端调用（支持登录系统）
import type {
  AgentRecord,
  DeviceRecord,
  NodeRecord,
  TaskCapsule,
  WSMessage,
} from "@shared/types";

// API 基址：默认空（相对路径，web/桌面端用同源）；手机端需通过 localStorage 配置 PC 后端地址
// 例如 localStorage.setItem("orbit_api_base", "http://192.168.1.100:8787")
const API_BASE_KEY = "orbit_api_base";
const TOKEN_KEY = "orbit_token";
const USERNAME_KEY = "orbit_username";

export function getApiBase(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(API_BASE_KEY) || "";
}
export function setApiBase(base: string) {
  if (base) localStorage.setItem(API_BASE_KEY, base);
  else localStorage.removeItem(API_BASE_KEY);
}

// ===== Token 管理 =====
export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
export function getUsername(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 自动携带 token（如果已登录）
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}/api${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ===== Devices =====
export const api = {
  // ===== Auth =====
  register(username: string, password: string) {
    return request<{ ok: boolean; userId: string; username: string; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  login(username: string, password: string) {
    return request<{ ok: boolean; userId: string; username: string; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  logout() {
    return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
  },
  getMe() {
    return request<{ loggedIn: boolean; userId: string; username: string }>("/auth/me");
  },

  // ===== Devices =====
  listDevices() {
    return request<DeviceRecord[]>("/devices");
  },
  registerDevice(input: {
    name: string;
    type: DeviceRecord["type"];
    capabilities?: string[];
    battery?: number;
    network?: "wifi" | "cellular" | "ethernet";
  }) {
    return request<DeviceRecord>("/devices", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  heartbeat(deviceId: string, load = 0, battery?: number) {
    return request<{ ok: boolean }>(`/devices/${deviceId}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ load, battery }),
    });
  },
  setDeviceOffline(deviceId: string) {
    return request<{ ok: boolean }>(`/devices/${deviceId}/offline`, {
      method: "POST",
    });
  },

  // ===== Capsules =====
  listCapsules() {
    return request<TaskCapsule[]>("/capsules");
  },
  getCapsule(id: string) {
    return request<TaskCapsule>(`/capsules/${id}`);
  },
  createCapsule(input: {
    goal: string;
    taskType: TaskCapsule["taskType"];
    riskLevel: TaskCapsule["riskLevel"];
    needsLocalFiles?: boolean;
    needsBrowserAuth?: boolean;
    fileSizeMB?: number;
    originDeviceType: TaskCapsule["originDevice"];
    originDeviceId?: string;
  }) {
    return request<TaskCapsule>("/capsules", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  approveCapsule(id: string, approved: boolean, resolvedBy?: string) {
    return request<TaskCapsule>(`/capsules/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approved, resolvedBy }),
    });
  },
  executeCapsule(id: string, agentId: string, workdir?: string) {
    return request<{ ok: boolean; message: string }>(`/capsules/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ agentId, workdir }),
    });
  },
  /** 导出胶囊为 JSON 上下文包 */
  exportCapsules(ids?: string[]) {
    const qs = ids ? `?ids=${ids.join(",")}` : "";
    return request<unknown>(`/capsules/export${qs}`);
  },
  /** 从 JSON 上下文包导入胶囊 */
  importCapsules(bundle: unknown) {
    return request<{ ok: boolean; imported: number; ids: string[] }>("/capsules/import", {
      method: "POST",
      body: JSON.stringify(bundle),
    });
  },
  /** 从 OpenCode workspace 导入 */
  importOpenCode(opencodePath?: string) {
    return request<{ ok: boolean; capsule: TaskCapsule }>("/capsules/import-opencode", {
      method: "POST",
      body: JSON.stringify({ opencodePath }),
    });
  },

  // ===== Agents =====
  listAgents() {
    return request<AgentRecord[]>("/agents");
  },
  createAgent(input: {
    name: string;
    abbr: string;
    command: string;
    args?: string;
    workdir?: string;
    capabilities?: string[];
    version?: string;
  }) {
    return request<AgentRecord>("/agents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateAgent(
    id: string,
    patch: {
      connected?: boolean;
      name?: string;
      command?: string;
      args?: string;
      workdir?: string;
    }
  ) {
    return request<AgentRecord>(`/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // ===== Nodes（联邦节点） =====
  listNodes() {
    return request<NodeRecord[]>("/nodes");
  },
  addNode(host: string, port: number, name?: string) {
    return request<{ ok: boolean; nodeId: string; message: string }>("/nodes", {
      method: "POST",
      body: JSON.stringify({ host, port, name }),
    });
  },
  deleteNode(id: string) {
    return request<{ ok: boolean }>(`/nodes/${id}`, {
      method: "DELETE",
    });
  },
};

// ===== WebSocket 客户端 =====
type WSHandler = (msg: WSMessage) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<WSHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const base = getApiBase();
    const host = base ? base.replace(/^https?:\/\//, "") : location.host;
    const proto = base.startsWith("https") ? "wss:" : "ws:";
    this.ws = new WebSocket(`${proto}//${host}/ws`);

    this.ws.onopen = () => {
      // 去除登录系统：无需 auth 握手，后端连接即归属默认用户
      // 心跳保活
      this.heartbeatTimer = setInterval(() => {
        this.send({ type: "heartbeat" });
      }, 30000);
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WSMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      // 断线重连
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(handler: WSHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WSClient();
