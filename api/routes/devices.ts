import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db";
import { authMiddleware } from "./auth";
import { broadcast } from "../ws";
import { syncRow } from "../sync";
import type { DeviceRecord, DeviceType } from "@shared/types";

export const deviceRouter = Router();
deviceRouter.use(authMiddleware);

const deviceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["phone", "office-pc", "home-pc", "cloud", "nas"]),
  capabilities: z.array(z.string()).default([]),
  battery: z.number().optional(),
  network: z.enum(["wifi", "cellular", "ethernet"]).optional(),
});

function rowToDevice(row: any): DeviceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as DeviceType,
    online: !!row.online,
    capabilities: JSON.parse(row.capabilities || "[]"),
    load: row.load ?? 0,
    battery: row.battery ?? undefined,
    network: row.network ?? undefined,
    lastSeen: row.last_seen,
  };
}

// 列出当前用户的所有设备
deviceRouter.get("/", (req, res) => {
  const userId = (req as any).userId as string;
  const rows = db.prepare("SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC").all(userId);
  res.json(rows.map(rowToDevice));
});

// 注册设备
deviceRouter.post("/", (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法" });
  const d = parsed.data;
  const id = `dev-${nanoid(10)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO devices (id, user_id, name, type, online, capabilities, load, battery, network, last_seen)
     VALUES (?, ?, ?, ?, 1, ?, 0, ?, ?, ?)`
  ).run(id, userId, d.name, d.type, JSON.stringify(d.capabilities), d.battery ?? null, d.network ?? null, now);
  syncRow("devices", id);
  const row = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  broadcast(userId, { type: "device:status", deviceId: id, online: true });
  res.json(rowToDevice(row));
});

// 心跳：维持在线 + 上报负载
deviceRouter.post("/:id/heartbeat", (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { load, battery } = req.body as { load?: number; battery?: number };
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE devices SET online = 1, last_seen = ?, load = ?, battery = ? WHERE id = ? AND user_id = ?")
    .run(now, load ?? 0, battery ?? null, id, userId);
  if (result.changes === 0) return res.status(404).json({ error: "设备不存在" });
  syncRow("devices", id);
  broadcast(userId, { type: "device:status", deviceId: id, online: true });
  res.json({ ok: true });
});

// 离线
deviceRouter.post("/:id/offline", (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  db.prepare("UPDATE devices SET online = 0 WHERE id = ? AND user_id = ?").run(id, userId);
  syncRow("devices", id);
  broadcast(userId, { type: "device:status", deviceId: id, online: false });
  res.json({ ok: true });
});

export { rowToDevice };
