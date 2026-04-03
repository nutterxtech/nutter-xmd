import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  BufferJSON,
  initAuthCreds,
  type WASocket,
  type SignalDataTypeMap,
  type AuthenticationCreds,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, botsTable, whatsappAuthTable } from "@workspace/db";
import { handleCommand } from "../commands/index";

interface SessionEntry {
  socket: WASocket | null;
  qrCode: string | null;
  status: "offline" | "connecting" | "online";
  pairingCodeResolver: ((code: string) => void) | null;
}

const activeSessions = new Map<string, SessionEntry>();

function getOrCreateEntry(userId: string): SessionEntry {
  if (!activeSessions.has(userId)) {
    activeSessions.set(userId, {
      socket: null,
      qrCode: null,
      status: "offline",
      pairingCodeResolver: null,
    });
  }
  return activeSessions.get(userId)!;
}

async function getBotSettings(userId: string) {
  try {
    const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
    return {
      prefix: bot?.prefix ?? "!",
      mode: bot?.mode ?? "public",
      autoRead: bot?.autoRead ?? false,
      typingStatus: bot?.typingStatus ?? false,
      alwaysOnline: bot?.alwaysOnline ?? false,
      antiCall: bot?.antiCall ?? false,
      autoReply: bot?.autoReply ?? false,
      autoReplyMessage: bot?.autoReplyMessage ?? "",
    };
  } catch {
    return { prefix: "!", mode: "public", autoRead: false, typingStatus: false, alwaysOnline: false, antiCall: false, autoReply: false, autoReplyMessage: "" };
  }
}

function jidFromPhone(phoneOrJid: string): string {
  const clean = phoneOrJid.split(":")[0].replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

async function sendStartupMessage(sock: WASocket, userId: string, selfJid: string) {
  try {
    const { prefix } = await getBotSettings(userId);
    const msg =
      `*NUTTER-XMD* is now *online* 🟢\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *Prefix:* \`${prefix}\`\n` +
      `🔋 *Status:* Active & Ready\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `> *Quick commands:*\n` +
      `▸ \`${prefix}menu\` — Full command menu\n` +
      `▸ \`${prefix}ping\` — Check bot speed\n\n` +
      `_Powered by NUTTER-XMD_ ⚡`;
    await sock.sendMessage(selfJid, { text: msg });
  } catch {}
}

// ─── Database-backed auth state ──────────────────────────────────────────────

async function useDatabaseAuthState(userId: string) {
  const rows = await db
    .select()
    .from(whatsappAuthTable)
    .where(eq(whatsappAuthTable.userId, userId))
    .limit(1);

  const existing = rows[0];

  const creds: AuthenticationCreds = existing?.creds
    ? JSON.parse(existing.creds, BufferJSON.reviver)
    : initAuthCreds();

  const keysMap: Record<string, any> = existing?.keys
    ? JSON.parse(existing.keys, BufferJSON.reviver)
    : {};

  async function persistToDb() {
    const credsStr = JSON.stringify(creds, BufferJSON.replacer);
    const keysStr = JSON.stringify(keysMap, BufferJSON.replacer);
    await db
      .insert(whatsappAuthTable)
      .values({ userId, creds: credsStr, keys: keysStr })
      .onConflictDoUpdate({
        target: whatsappAuthTable.userId,
        set: { creds: credsStr, keys: keysStr },
      });
  }

  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        const val = keysMap[`${type}/${id}`];
        if (val !== undefined) result[id] = val;
      }
      return result;
    },
    set: async (data: {
      [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null };
    }) => {
      for (const type in data) {
        const entries = (data as any)[type];
        for (const id in entries) {
          const val = entries[id];
          const k = `${type}/${id}`;
          if (val != null) {
            keysMap[k] = val;
          } else {
            delete keysMap[k];
          }
        }
      }
      await persistToDb();
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await persistToDb();
    },
  };
}

export async function clearDatabaseAuthState(userId: string) {
  await db
    .delete(whatsappAuthTable)
    .where(eq(whatsappAuthTable.userId, userId));
}

// ─── Socket lifecycle ─────────────────────────────────────────────────────────

async function startSocket(
  userId: string,
  entry: SessionEntry,
  onStatusChange?: (status: "offline" | "connecting" | "online") => void
): Promise<WASocket> {
  const { state, saveCreds } = await useDatabaseAuthState(userId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    logger: {
      level: "silent",
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: () => ({
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({} as any),
        fatal: () => {},
      }),
      fatal: () => {},
    } as any,
  });

  entry.socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        entry.qrCode = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch {
        entry.qrCode = qr;
      }
      entry.status = "connecting";
      onStatusChange?.("connecting");
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;

      entry.status = "offline";
      entry.qrCode = null;
      entry.socket = null;
      onStatusChange?.("offline");

      if (loggedOut) {
        // Wipe stored credentials so user must re-pair
        await clearDatabaseAuthState(userId);
        activeSessions.delete(userId);
      } else {
        // Reconnect — credentials stay in DB
        const newEntry = getOrCreateEntry(userId);
        setTimeout(() => startSocket(userId, newEntry, onStatusChange), 3000);
      }
    }

    if (connection === "open") {
      entry.status = "online";
      entry.qrCode = null;
      onStatusChange?.("online");

      try {
        const selfId = sock.user?.id;
        await db
          .update(botsTable)
          .set({
            status: "online",
            phoneNumber: selfId ? jidFromPhone(selfId).replace("@s.whatsapp.net", "") : undefined,
          })
          .where(eq(botsTable.userId, userId));
      } catch {}

      if (sock.user?.id) {
        const selfJid = jidFromPhone(sock.user.id);
        setTimeout(() => sendStartupMessage(sock, userId, selfJid), 2000);
      }
    }
  });

  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      const { antiCall } = await getBotSettings(userId);
      if (antiCall && call.status === "offer") {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, { text: "❌ *Auto-rejected:* Calls are disabled for this bot." });
        } catch {}
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (!msg.key.remoteJid || msg.key.remoteJid === "status@broadcast") continue;

      const jid = msg.key.remoteJid;
      const sentAt = (msg.messageTimestamp as number) * 1000 || Date.now();
      const settings = await getBotSettings(userId);

      // Auto-read
      if (settings.autoRead) {
        try { await sock.readMessages([msg.key]); } catch {}
      }

      // Always online presence
      if (settings.alwaysOnline) {
        try { await sock.sendPresenceUpdate("available", jid); } catch {}
      }

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "";

      if (!body.trim()) continue;

      // Typing indicator when processing commands
      if (settings.typingStatus && body.startsWith(settings.prefix)) {
        try { await sock.sendPresenceUpdate("composing", jid); } catch {}
        setTimeout(async () => { try { await sock.sendPresenceUpdate("paused", jid); } catch {} }, 2000);
      }

      // Command handling
      if (body.startsWith(settings.prefix)) {
        await handleCommand(sock, userId, jid, body, settings.prefix, sentAt, msg, settings.mode);
        continue;
      }

      // Auto-reply chatbot (only in DMs, not groups, when enabled)
      if (settings.autoReply && !msg.key.fromMe && !jid.endsWith("@g.us")) {
        const replyMsg = settings.autoReplyMessage || "I'm currently unavailable. Please try later.";
        try { await sock.sendMessage(jid, { text: replyMsg }); } catch {}
      }
    }
  });

  return sock;
}

// ─── Auto-reconnect on server startup ────────────────────────────────────────

export async function reconnectAllSavedSessions() {
  try {
    const saved = await db.select().from(whatsappAuthTable);
    if (saved.length === 0) return;

    console.log(`[whatsapp] Auto-reconnecting ${saved.length} saved session(s)...`);

    for (const row of saved) {
      // Only reconnect if creds exist (means user has paired before)
      if (!row.creds) continue;

      const entry = getOrCreateEntry(row.userId);
      if (entry.socket) continue; // already running

      startSocket(row.userId, entry).catch((err) => {
        console.error(`[whatsapp] Failed to reconnect session for ${row.userId}:`, err);
      });

      // Stagger reconnects to avoid flooding WhatsApp
      await new Promise((r) => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error("[whatsapp] Auto-reconnect error:", err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function requestQRCode(
  userId: string
): Promise<{ qrCode: string | null; status: string }> {
  const entry = getOrCreateEntry(userId);

  if (entry.status === "online") {
    return { qrCode: null, status: "online" };
  }

  if (entry.status === "connecting" && entry.qrCode) {
    return { qrCode: entry.qrCode, status: "connecting" };
  }

  if (!entry.socket) {
    await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 3000));
  }

  return {
    qrCode: entry.qrCode,
    status: entry.qrCode ? "connecting" : entry.status,
  };
}

export async function requestPairingCode(
  userId: string,
  phoneNumber: string
): Promise<string> {
  const entry = getOrCreateEntry(userId);

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 7) {
    throw new Error("Invalid phone number");
  }

  let sock = entry.socket;

  if (!sock || entry.status === "offline") {
    sock = await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (entry.status === "online") {
    throw new Error("Already connected");
  }

  const code = await sock!.requestPairingCode(cleanPhone);
  return code;
}

export async function disconnectSession(userId: string): Promise<void> {
  const entry = activeSessions.get(userId);
  if (entry?.socket) {
    try {
      await entry.socket.logout();
    } catch {}
    entry.socket = null;
    entry.status = "offline";
    entry.qrCode = null;
  }
  activeSessions.delete(userId);

  // Wipe credentials from DB so bot won't auto-reconnect
  await clearDatabaseAuthState(userId);

  // Also clear the bot status
  try {
    await db
      .update(botsTable)
      .set({ status: "offline", phoneNumber: null })
      .where(eq(botsTable.userId, userId));
  } catch {}
}

export function getSessionStatus(userId: string): "offline" | "connecting" | "online" {
  return activeSessions.get(userId)?.status ?? "offline";
}
