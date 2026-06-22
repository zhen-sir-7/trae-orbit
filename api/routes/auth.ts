import { type Request, type Response, type NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import { db } from "../db";

// ===== 密码哈希（使用 Node.js 内置 scrypt） =====
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  return testHash.length === storedBuf.length && timingSafeEqual(testHash, storedBuf);
}

// ===== 生成 token =====
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// ===== 默认本地用户（桌面端/手机端无需登录，自动归属此用户） =====
export const LOCAL_USER_ID = "u-local";
export const LOCAL_USERNAME = "local";

// ===== 认证中间件 =====
// 规则：
// 1. 如果请求带 Authorization: Bearer <token>，则按 token 查找用户
// 2. 如果不带 token，则归属默认本地用户（u-local），兼容桌面端/手机端
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = db.prepare("SELECT id, username FROM users WHERE token = ?").get(token) as
      | { id: string; username: string }
      | undefined;
    if (user) {
      (req as any).userId = user.id;
      (req as any).username = user.username;
      next();
      return;
    }
    // token 无效 → 401
    _res.status(401).json({ error: "无效的认证令牌" });
    return;
  }
  // 无 token → 默认本地用户（桌面端/手机端）
  (req as any).userId = LOCAL_USER_ID;
  (req as any).username = LOCAL_USERNAME;
  next();
}

// ===== 认证路由（注册 / 登录 / 当前用户信息） =====
export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// POST /api/auth/register - 注册新用户
authRouter.post("/register", (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message || "参数无效" });
    return;
  }
  const { username, password } = parsed.data;

  // 检查用户名是否已存在
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    res.status(409).json({ error: "用户名已存在" });
    return;
  }

  const id = `u-${nanoid(12)}`;
  const token = generateToken();
  const hashed = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, username, password, token, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, username, hashed, token, now);

  res.json({ ok: true, userId: id, username, token });
});

// POST /api/auth/login - 登录
authRouter.post("/login", (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "参数无效" });
    return;
  }
  const { username, password } = parsed.data;

  const user = db.prepare("SELECT id, username, password, token FROM users WHERE username = ?").get(username) as
    | { id: string; username: string; password: string; token: string | null }
    | undefined;

  if (!user || !user.password) {
    res.status(401).json({ error: "用户名或密码错误" });
    return;
  }

  if (!verifyPassword(password, user.password)) {
    res.status(401).json({ error: "用户名或密码错误" });
    return;
  }

  // 每次登录生成新 token（旧 token 失效）
  const token = generateToken();
  db.prepare("UPDATE users SET token = ? WHERE id = ?").run(token, user.id);

  res.json({ ok: true, userId: user.id, username: user.username, token });
});

// POST /api/auth/logout - 登出（清除 token）
authRouter.post("/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    db.prepare("UPDATE users SET token = NULL WHERE token = ?").run(token);
  }
  res.json({ ok: true });
});

// GET /api/auth/me - 获取当前用户信息
authRouter.get("/me", (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const username = (req as any).username;
  if (!userId || userId === LOCAL_USER_ID) {
    res.json({ loggedIn: false, userId: LOCAL_USER_ID, username: LOCAL_USERNAME });
    return;
  }
  res.json({ loggedIn: true, userId, username });
});
