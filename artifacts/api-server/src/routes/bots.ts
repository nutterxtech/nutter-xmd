import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, botsTable } from "@workspace/db";
import { UpdateMyBotBody } from "@workspace/api-zod";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

async function getOrCreateBot(userId: string) {
  const existing = await db
    .select()
    .from(botsTable)
    .where(eq(botsTable.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [bot] = await db
    .insert(botsTable)
    .values({ userId, name: "My Bot", status: "offline" })
    .returning();

  return bot;
}

// GET /api/bot — get (or auto-create) the user's single bot
router.get("/bot", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const bot = await getOrCreateBot(req.userId);
    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/bot — update bot settings
router.put("/bot", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = UpdateMyBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bot = await getOrCreateBot(req.userId);

  const [updated] = await db
    .update(botsTable)
    .set({ ...parsed.data })
    .where(eq(botsTable.id, bot.id))
    .returning();

  res.json(updated);
});

// GET /api/bot/qr — get QR code for WhatsApp connection
router.get("/bot/qr", requireAuth, async (req: any, res): Promise<void> => {
  const bot = await getOrCreateBot(req.userId);

  if (bot.status === "online") {
    res.json({ status: "online", qrCode: null });
    return;
  }

  // Simulate QR code generation (placeholder — real Baileys integration would go here)
  await db
    .update(botsTable)
    .set({ status: "connecting" })
    .where(eq(botsTable.id, bot.id));

  res.json({
    status: "connecting",
    qrCode: null,
    message: "Scan QR with WhatsApp to connect",
  });
});

// POST /api/bot/pair — request pairing code
router.post("/bot/pair", requireAuth, async (req: any, res): Promise<void> => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: "phoneNumber is required" });
    return;
  }

  const bot = await getOrCreateBot(req.userId);

  // Generate a mock pairing code (8 uppercase chars) — real impl would call Baileys
  const code = Math.random().toString(36).toUpperCase().slice(2, 10);

  await db
    .update(botsTable)
    .set({ status: "connecting", phoneNumber })
    .where(eq(botsTable.id, bot.id));

  res.json({ code });
});

// POST /api/bot/disconnect — disconnect bot
router.post("/bot/disconnect", requireAuth, async (req: any, res): Promise<void> => {
  const bot = await getOrCreateBot(req.userId);

  const [updated] = await db
    .update(botsTable)
    .set({ status: "offline", phoneNumber: null })
    .where(eq(botsTable.id, bot.id))
    .returning();

  res.json(updated);
});

export default router;
