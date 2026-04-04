import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, botsTable, whatsappAuthTable, botCommandsTable, usersTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import { disconnectSession } from "../lib/whatsapp";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Nutterx Dev";
const ADMIN_KEY = process.env.ADMIN_KEY || "42819408nutterxmd";
const ADMIN_TOKEN = `${ADMIN_USERNAME}:${ADMIN_KEY}:admin`;

const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

async function enrichWithUserData(userIds: string[]) {
  if (!userIds.length) return {};
  const numericIds = userIds.map(Number).filter(Boolean);
  if (!numericIds.length) return {};

  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
    .from(usersTable)
    .where(inArray(usersTable.id, numericIds));

  const map: Record<string, { email: string; username: string }> = {};
  for (const u of users) {
    map[String(u.id)] = { email: u.email, username: u.username };
  }
  return map;
}

// ── Login ────────────────────────────────────────────────────────────────────
router.post("/admin/login", async (req: any, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.username !== ADMIN_USERNAME || parsed.data.key !== ADMIN_KEY) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  res.json({ token: ADMIN_TOKEN });
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable);
  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const onlineBots = bots.filter((b) => b.status === "online").length;
  const suspendedBots = bots.filter((b) => !b.isActive).length;
  const uniqueUserIds = new Set(bots.map((b) => b.userId));
  const totalUsers = uniqueUserIds.size;
  res.json({ totalUsers, totalBots, activeBots, onlineBots, suspendedBots });
});

// ── All users enriched from users table ──────────────────────────────────────
router.get("/admin/users", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  const userData = await enrichWithUserData(bots.map((b) => b.userId));

  const result = bots.map((bot) => ({
    ...bot,
    email: userData[bot.userId]?.email ?? null,
    username: userData[bot.userId]?.username ?? null,
  }));

  res.json(result);
});

// ── Activate ──────────────────────────────────────────────────────────────────
router.post("/admin/bots/:id/activate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.update(botsTable).set({ isActive: true }).where(eq(botsTable.id, id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json(bot);
});

// ── Suspend ───────────────────────────────────────────────────────────────────
router.post("/admin/bots/:id/deactivate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.update(botsTable).set({ isActive: false }).where(eq(botsTable.id, id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json(bot);
});

// ── Delete user (wipes bot, session, DB rows, users table row) ────────────────
router.delete("/admin/bots/:id", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, id)).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  try { await disconnectSession(bot.userId); } catch {}

  await db.delete(botCommandsTable).where(eq(botCommandsTable.botId, id));
  await db.delete(whatsappAuthTable).where(eq(whatsappAuthTable.userId, bot.userId));
  await db.delete(botsTable).where(eq(botsTable.id, id));

  // Delete from users table too
  const numericUserId = Number(bot.userId);
  if (!isNaN(numericUserId)) {
    await db.delete(usersTable).where(eq(usersTable.id, numericUserId));
  }

  res.status(204).send();
});

// ── Legacy /admin/bots ────────────────────────────────────────────────────────
router.get("/admin/bots", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  res.json(bots);
});

export default router;
