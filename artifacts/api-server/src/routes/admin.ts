import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, botsTable, whatsappAuthTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import { createClerkClient } from "@clerk/express";

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

// Clerk client for fetching user emails — only instantiated if key is present
function getClerkClient() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  return createClerkClient({ secretKey: key });
}

async function enrichWithClerkData(userIds: string[]) {
  const clerk = getClerkClient();
  const map: Record<string, { email: string | null; firstName: string | null; lastName: string | null }> = {};
  if (!clerk) return map;

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const user = await clerk.users.getUser(uid);
        map[uid] = {
          email: user.emailAddresses[0]?.emailAddress ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        };
      } catch {
        map[uid] = { email: null, firstName: null, lastName: null };
      }
    })
  );
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

// ── All users with enriched Clerk data ───────────────────────────────────────
router.get("/admin/users", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  const clerkData = await enrichWithClerkData(bots.map((b) => b.userId));

  const result = bots.map((bot) => ({
    ...bot,
    email: clerkData[bot.userId]?.email ?? null,
    firstName: clerkData[bot.userId]?.firstName ?? null,
    lastName: clerkData[bot.userId]?.lastName ?? null,
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

// ── Delete (removes bot + WhatsApp session) ───────────────────────────────────
router.delete("/admin/bots/:id", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, id)).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  // Clear WhatsApp auth session from DB
  await db.delete(whatsappAuthTable).where(eq(whatsappAuthTable.userId, bot.userId));
  // Delete the bot record
  await db.delete(botsTable).where(eq(botsTable.id, id));

  res.status(204).send();
});

// ── Legacy /admin/bots (kept for backward compat) ────────────────────────────
router.get("/admin/bots", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  res.json(bots);
});

export default router;
