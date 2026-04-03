import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "nutterx";
const ADMIN_KEY = process.env.ADMIN_KEY || "nutterx2025!";
const ADMIN_TOKEN = `${ADMIN_USERNAME}:${ADMIN_KEY}:admin`;

const requireAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

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

router.get("/admin/bots", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  res.json(bots);
});

router.post("/admin/bots/:id/activate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.update(botsTable).set({ isActive: true }).where(eq(botsTable.id, id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json(bot);
});

router.post("/admin/bots/:id/deactivate", requireAdminAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bot] = await db.update(botsTable).set({ isActive: false }).where(eq(botsTable.id, id)).returning();
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  res.json(bot);
});

router.get("/admin/stats", requireAdminAuth, async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable);
  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const onlineBots = bots.filter((b) => b.status === "online").length;
  const uniqueUserIds = new Set(bots.map((b) => b.userId));
  const totalUsers = uniqueUserIds.size;
  res.json({ totalUsers, totalBots, activeBots, onlineBots });
});

export default router;
