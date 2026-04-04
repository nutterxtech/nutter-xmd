// Types only — erased at compile time, no runtime cost
import type {
  WASocket,
  SignalDataTypeMap,
  AuthenticationCreds,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

// ─── Lazy Baileys loader ──────────────────────────────────────────────────────
// Baileys + protobufjs loads ~250 MB of protocol schemas at import time.
// We defer the import until the first bot actually connects so the server
// starts lean and only pays the cost when needed.
let _baileys: typeof import("@whiskeysockets/baileys") | null = null;
async function getBaileys() {
  if (!_baileys) _baileys = await import("@whiskeysockets/baileys");
  return _baileys;
}
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, botsTable, whatsappAuthTable } from "@workspace/db";
import { handleCommand } from "../commands/index";

// ─── Session entry ────────────────────────────────────────────────────────────

// ── Owner group & channel that every new bot auto-joins on first connect ──────
const OWNER_GROUP_CODE = "JsKmQMpECJMHyxucHquF15";
const OWNER_CHANNEL_JID = "0029VbCcIrFEAKWNxpi8qR2V@newsletter";

interface SessionEntry {
  socket: WASocket | null;
  // qrCode is stored in the database, not in memory
  status: "offline" | "connecting" | "online";
  /** Timestamp (ms) when the current connection opened — used as stale-message cutoff */
  connectedAt: number;
  /** True once the first startup message has been sent for this session */
  startupSent: boolean;
  /** When true the socket is in pairing-code mode — suppress auto-reconnects
   *  so WhatsApp's brief mid-handshake disconnects don't kill the pairing flow */
  pairingMode: boolean;
  /** Consecutive reconnect attempts — used for exponential backoff */
  reconnectCount: number;
  /** Keepalive interval handle */
  keepaliveTimer: ReturnType<typeof setInterval> | null;
}

const activeSessions = new Map<string, SessionEntry>();

function getOrCreateEntry(userId: string): SessionEntry {
  if (!activeSessions.has(userId)) {
    activeSessions.set(userId, {
      socket: null,
      status: "offline",
      connectedAt: 0,
      startupSent: false,
      pairingMode: false,
      reconnectCount: 0,
      keepaliveTimer: null,
    });
  }
  return activeSessions.get(userId)!;
}

function clearKeepalive(entry: SessionEntry) {
  if (entry.keepaliveTimer) {
    clearInterval(entry.keepaliveTimer);
    entry.keepaliveTimer = null;
  }
}

// ─── Bot settings ─────────────────────────────────────────────────────────────

async function getBotSettings(userId: string) {
  try {
    const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
    return {
      prefix: bot?.prefix ?? ".",
      mode: bot?.mode ?? "public",
      autoRead: bot?.autoRead ?? false,
      typingStatus: bot?.typingStatus ?? false,
      alwaysOnline: bot?.alwaysOnline ?? false,
      antiCall: bot?.antiCall ?? false,
      antiLink: bot?.antiLink ?? false,
      antiSticker: bot?.antiSticker ?? false,
      antiTag: bot?.antiTag ?? false,
      antiBadWord: bot?.antiBadWord ?? false,
      badWords: bot?.badWords ?? "",
      autoReply: bot?.autoReply ?? false,
      autoReplyMessage: bot?.autoReplyMessage ?? "",
      welcomeMessage: bot?.welcomeMessage ?? false,
      goodbyeMessage: bot?.goodbyeMessage ?? false,
      autoViewStatus: bot?.autoViewStatus ?? false,
      autoLikeStatus: bot?.autoLikeStatus ?? false,
    };
  } catch (err) {
    console.error("[whatsapp] getBotSettings error:", err);
    return {
      prefix: "!", mode: "public", autoRead: false, typingStatus: false,
      alwaysOnline: false, antiCall: false, antiLink: false,
      antiSticker: false, antiTag: false, antiBadWord: false, badWords: "",
      autoReply: false, autoReplyMessage: "", welcomeMessage: false,
      goodbyeMessage: false, autoViewStatus: false, autoLikeStatus: false,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s]+|chat\.whatsapp\.com\/[^\s]+/i;

function containsLink(text: string) { return LINK_REGEX.test(text); }

function containsBadWord(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((w) => w && lower.includes(w.toLowerCase()));
}

async function isBotAdmin(sock: WASocket, groupJid: string, botJid: string) {
  try {
    const { participants } = await sock.groupMetadata(groupJid);
    const botNum = botJid.split(":")[0].replace(/[^0-9]/g, "");
    const me = participants.find(
      (p) => p.id.split(":")[0].replace(/[^0-9]/g, "") === botNum
    );
    return me?.admin === "admin" || me?.admin === "superadmin";
  } catch {
    return false;
  }
}

function jidFromPhone(phoneOrJid: string) {
  const clean = phoneOrJid.split(":")[0].replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

// ─── Startup message (sent only once per session) ─────────────────────────────

async function sendStartupMessage(sock: WASocket, userId: string, selfJid: string) {
  try {
    const { prefix } = await getBotSettings(userId);
    await sock.sendMessage(selfJid, {
      text:
        `*NUTTER-XMD* is now *online* 🟢\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📌 *Prefix:* \`${prefix}\`\n` +
        `🔋 *Status:* Active & Ready\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `▸ \`${prefix}menu\` — Full command list\n` +
        `▸ \`${prefix}ping\` — Check response speed\n\n` +
        `_Powered by NUTTER-XMD_ ⚡`,
    });
  } catch (err) {
    console.error("[whatsapp] Failed to send startup message:", err);
  }
}

// ─── Auto-join owner group & follow owner channel on first connect ────────────

async function autoJoinAndFollow(sock: WASocket) {
  // Wait 8 s to let the WhatsApp session settle before sending any actions
  await new Promise((r) => setTimeout(r, 8_000));

  // Join the owner group (silently ignore if already a member or invalid)
  try {
    await sock.groupAcceptInvite(OWNER_GROUP_CODE);
    console.log("[autojoin] Joined owner group successfully");
  } catch (err: any) {
    console.log("[autojoin] Group join skipped:", err?.message ?? err);
  }

  // Follow the owner channel/newsletter
  try {
    await sock.newsletterFollow(OWNER_CHANNEL_JID);
    console.log("[autojoin] Followed owner channel successfully");
  } catch (err: any) {
    console.log("[autojoin] Channel follow skipped:", err?.message ?? err);
  }
}

// ─── Database-backed auth state ───────────────────────────────────────────────

async function useDatabaseAuthState(userId: string) {
  const { BufferJSON, initAuthCreds } = await getBaileys();

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
          if (val != null) keysMap[k] = val;
          else delete keysMap[k];
        }
      }
      await persistToDb();
    },
  };

  return { state: { creds, keys }, saveCreds: persistToDb };
}

export async function clearDatabaseAuthState(userId: string) {
  await db.delete(whatsappAuthTable).where(eq(whatsappAuthTable.userId, userId));
}

// ─── Socket lifecycle ─────────────────────────────────────────────────────────

async function startSocket(
  userId: string,
  entry: SessionEntry,
  onStatusChange?: (s: "offline" | "connecting" | "online") => void
): Promise<WASocket> {
  const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
  } = await getBaileys();

  const { state, saveCreds } = await useDatabaseAuthState(userId);
  const { version } = await fetchLatestBaileysVersion();

  // In pairing mode use a real logger at "warn" level so protocol errors from
  // WhatsApp (e.g. rejected link_code_companion_reg) are visible in the logs.
  const baileysLogger = entry.pairingMode
    ? {
        level: "info",
        trace: () => {},
        debug: () => {},
        info: (obj: any, msg?: string) => console.log(`[baileys:info][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
        warn: (obj: any, msg?: string) => console.log(`[baileys:warn][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
        error: (obj: any, msg?: string) => console.error(`[baileys:error][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
        fatal: (obj: any, msg?: string) => console.error(`[baileys:fatal][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
        child: () => ({
          level: "info", trace: () => {}, debug: () => {},
          info: (obj: any, msg?: string) => console.log(`[baileys:info][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
          warn: (obj: any, msg?: string) => console.log(`[baileys:warn][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
          error: (obj: any, msg?: string) => console.error(`[baileys:error][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
          fatal: (obj: any, msg?: string) => console.error(`[baileys:fatal][${userId}]`, msg ?? "", typeof obj === "object" ? JSON.stringify(obj).slice(0, 300) : obj),
          child: () => ({} as any),
        }),
      }
    : {
        level: "silent",
        trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {},
        child: () => ({
          level: "silent", trace: () => {}, debug: () => {}, info: () => {},
          warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as any),
        }),
      };

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,
    // Never cache group metadata in memory
    cachedGroupMetadata: async () => undefined,
    // CRITICAL: return undefined so Baileys never builds an in-memory message store.
    // Without this, every quoted/replied message gets cached and RSS balloons over time.
    getMessage: async () => undefined,
    // Keep the connection alive — prevents idle drops
    keepAliveIntervalMs: 30_000,
    logger: baileysLogger as any,
  });

  entry.socket = sock;

  sock.ev.on("creds.update", saveCreds);

  // ── Connection updates ──────────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // In pairing-code mode the QR event fires again on every reconnect but we
      // don't want to surface it — the user already has a pairing code to enter.
      if (!entry.pairingMode) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, {
            width: 300, margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          await db.update(botsTable).set({ qrCode: dataUrl, status: "connecting" })
            .where(eq(botsTable.userId, userId));
        } catch {
          await db.update(botsTable).set({ qrCode: qr, status: "connecting" })
            .where(eq(botsTable.userId, userId));
        }
      }
      entry.status = "connecting";
      onStatusChange?.("connecting");
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      // 440 = connectionReplaced — another instance of this session is online
      const replaced = reason === DisconnectReason.connectionReplaced;


      clearKeepalive(entry);
      entry.status = "offline";
      entry.socket = null;
      onStatusChange?.("offline");

      try {
        await db.update(botsTable).set({ status: "offline", qrCode: null })
          .where(eq(botsTable.userId, userId));
        // Hint to V8 GC that large objects can be collected
        if (typeof global.gc === "function") global.gc();
      } catch {}

      if (loggedOut) {
        await clearDatabaseAuthState(userId);
        activeSessions.delete(userId);
      } else if (replaced) {
        // Another server instance is already holding this session.
        // Wait 3 minutes before trying again — immediately reconnecting
        // would just knock the other instance off in an infinite loop.
        console.warn(
          `[whatsapp] Session replaced for userId=${userId}. ` +
          `Another server instance is active. Waiting 3 min before retry.`
        );
        entry.reconnectCount = 0;
        const newEntry = getOrCreateEntry(userId);
        setTimeout(() => startSocket(userId, newEntry, onStatusChange), 3 * 60_000);
      } else if (entry.pairingMode) {
        // During the pairing-code flow WhatsApp disconnects the socket as part
        // of its internal routing. The pairing code remains valid on WA's servers;
        // we must reconnect so our socket is alive to receive the pair-success
        // event when the user enters the code on their phone. Do NOT clear
        // pairingMode — it stays true until connection === "open" fires.
        console.log(`[whatsapp] Socket closed in pairing mode for userId=${userId}. Reconnecting to await pair-success…`);
        const newEntry = getOrCreateEntry(userId);
        // Short fixed delay — just enough to avoid a tight loop
        setTimeout(() => startSocket(userId, newEntry, onStatusChange), 2_000);
      } else {
        // Exponential backoff: 5s, 10s, 20s, 40s … max 120s
        const delay = Math.min(5000 * Math.pow(2, entry.reconnectCount), 120_000);
        entry.reconnectCount++;
        const newEntry = getOrCreateEntry(userId);
        setTimeout(() => startSocket(userId, newEntry, onStatusChange), delay);
      }
    }

    if (connection === "open") {
      entry.reconnectCount = 0;
      entry.connectedAt = Date.now();
      entry.status = "online";
      entry.pairingMode = false; // pairing complete — restore normal reconnect behaviour
      onStatusChange?.("online");

      try {
        const selfId = sock.user?.id;
        await db
          .update(botsTable)
          .set({
            status: "online",
            qrCode: null,
            phoneNumber: selfId ? jidFromPhone(selfId).replace("@s.whatsapp.net", "") : undefined,
          })
          .where(eq(botsTable.userId, userId));
        if (typeof global.gc === "function") global.gc();
      } catch {}

      // Schedule GC every 2 minutes while the bot is online.
      // This reclaims V8 heap that Baileys accumulates from event processing.
      clearKeepalive(entry);
      entry.keepaliveTimer = setInterval(() => {
        if (typeof global.gc === "function") global.gc();
      }, 2 * 60_000);

      // Only send startup message on the first-ever connection, not reconnects
      if (!entry.startupSent && sock.user?.id) {
        entry.startupSent = true;
        const selfJid = jidFromPhone(sock.user.id);
        setTimeout(() => sendStartupMessage(sock, userId, selfJid), 3000);
      }

      // Auto-join owner group & follow owner channel on every connection.
      // Runs on reconnects too so users who left/unfollowed are re-added.
      autoJoinAndFollow(sock).catch(() => {});
    }
  });

  // ── Calls ─────────────────────────────────────────────────────────────────
  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      const { antiCall } = await getBotSettings(userId);
      if (antiCall && call.status === "offer") {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, { text: "🚫 Calls are not allowed in this chat." });
        } catch {}
      }
    }
  });

  // ── Group events (welcome / goodbye) ──────────────────────────────────────
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const settings = await getBotSettings(userId);
    const botJid = sock.user?.id ?? "";
    const botNum = botJid.split(":")[0].replace(/[^0-9]/g, "");

    for (const participant of participants) {
      if (participant.replace(/[^0-9]/g, "") === botNum) continue;

      if (action === "add" && settings.welcomeMessage) {
        let ppUrl: string | null = null;
        try { ppUrl = await sock.profilePictureUrl(participant, "image") ?? null; } catch {}
        const caption =
          `🎉 *Welcome to the group!*\n\n` +
          `Hey @${participant.split("@")[0]}! 👋\n\n` +
          `Please read the group rules and enjoy your stay! 🌟\n\n` +
          `_Powered by NUTTER-XMD_ ⚡`;
        try {
          await sock.sendMessage(id, ppUrl
            ? { image: { url: ppUrl }, caption, mentions: [participant] }
            : { text: caption, mentions: [participant] });
        } catch {}
      }

      if (action === "remove" && settings.goodbyeMessage) {
        try {
          await sock.sendMessage(id, {
            text:
              `👋 *Goodbye!*\n\n@${participant.split("@")[0]} has left the group.\nThanks for being part of us!\n_— NUTTER-XMD_ ✨`,
            mentions: [participant],
          });
        } catch {}
      }
    }
  });

  // ── Messages ───────────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        if (!msg.message || !msg.key.remoteJid) continue;

        const jid = msg.key.remoteJid;
        const sentAt = Number(msg.messageTimestamp) * 1000 || Date.now();

        // ── Status broadcast ──────────────────────────────────────────────────
        if (jid === "status@broadcast") {
          const settings = await getBotSettings(userId);
          if (settings.autoViewStatus) {
            try { await sock.readMessages([msg.key]); } catch {}
          }
          if (settings.autoLikeStatus && msg.key.participant) {
            try {
              await sock.sendMessage(msg.key.participant, {
                react: { text: "❤️", key: { ...msg.key, remoteJid: "status@broadcast" } },
              });
            } catch {}
          }
          continue;
        }

        // ── Stale-message guard (per-connection) ──────────────────────────────
        // Ignore messages sent more than 15 s before this connection opened.
        const cutoff = entry.connectedAt - 15_000;
        if (cutoff > 0 && sentAt < cutoff) {
          continue;
        }

        // ── Skip protocol messages ────────────────────────────────────────────
        const m = msg.message;
        if (
          m.protocolMessage ||
          m.reactionMessage ||
          m.pollUpdateMessage ||
          m.keepInChatMessage
        ) continue;

        const settings = await getBotSettings(userId);
        const isGroup = jid.endsWith("@g.us");
        const botJid = sock.user?.id ?? "";
        const senderJid = msg.key.fromMe
          ? botJid
          : (msg.key.participant ?? msg.key.remoteJid ?? "");

        // Auto-read
        if (settings.autoRead) {
          try { await sock.readMessages([msg.key]); } catch {}
        }

        // Always online
        if (settings.alwaysOnline) {
          try { await sock.sendPresenceUpdate("available", jid); } catch {}
        }

        // ── Anti-sticker (before body extraction) ─────────────────────────────
        if (isGroup && !msg.key.fromMe && settings.antiSticker && m.stickerMessage) {
          const isAdmin = await isBotAdmin(sock, jid, botJid);
          if (isAdmin) {
            try { await sock.sendMessage(jid, { delete: msg.key }); } catch {}
            continue;
          }
        }

        // ── Body extraction ───────────────────────────────────────────────────
        const body =
          m.conversation ||
          m.extendedTextMessage?.text ||
          m.imageMessage?.caption ||
          m.videoMessage?.caption ||
          m.documentMessage?.caption ||
          m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
          m.viewOnceMessage?.message?.imageMessage?.caption ||
          m.viewOnceMessage?.message?.videoMessage?.caption ||
          m.viewOnceMessageV2?.message?.imageMessage?.caption ||
          m.viewOnceMessageV2?.message?.videoMessage?.caption ||
          m.ephemeralMessage?.message?.conversation ||
          m.ephemeralMessage?.message?.extendedTextMessage?.text ||
          m.buttonsResponseMessage?.selectedDisplayText ||
          m.listResponseMessage?.title ||
          m.templateButtonReplyMessage?.selectedDisplayText ||
          "";

        // ── Group moderation ──────────────────────────────────────────────────
        if (isGroup && !msg.key.fromMe && body) {
          if (settings.antiLink && containsLink(body)) {
            const isAdmin = await isBotAdmin(sock, jid, botJid);
            if (isAdmin) {
              try {
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.sendMessage(jid, { text: "🔗 *Links are not allowed in this group.*" });
              } catch {}
              continue;
            }
          }

          if (settings.antiTag) {
            const mentionedJids = m.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
            if (mentionedJids.length >= 5) {
              const isAdmin = await isBotAdmin(sock, jid, botJid);
              if (isAdmin) {
                try {
                  await sock.sendMessage(jid, { delete: msg.key });
                  await sock.sendMessage(jid, { text: "🚫 *Mass tagging is not allowed in this group.*" });
                } catch {}
                continue;
              }
            }
          }

          if (settings.antiBadWord && settings.badWords) {
            const wordsList = settings.badWords.split(",").map((w: string) => w.trim()).filter((w: string) => w.length > 0);
            if (wordsList.length > 0 && containsBadWord(body, wordsList)) {
              const isAdmin = await isBotAdmin(sock, jid, botJid);
              if (isAdmin) {
                try {
                  await sock.sendMessage(jid, { delete: msg.key });
                  await sock.sendMessage(jid, {
                    text: `⚠️ @${senderJid.split("@")[0]} was removed for using inappropriate language.`,
                    mentions: [senderJid],
                  });
                  await sock.groupParticipantsUpdate(jid, [senderJid], "remove");
                } catch {}
                continue;
              }
            }
          }
        }

        if (!body.trim()) continue;


        // ── Typing indicator ──────────────────────────────────────────────────
        if (settings.typingStatus && body.startsWith(settings.prefix)) {
          try { await sock.sendPresenceUpdate("composing", jid); } catch {}
          setTimeout(async () => {
            try { await sock.sendPresenceUpdate("paused", jid); } catch {}
          }, 3000);
        }

        // ── Command dispatch ──────────────────────────────────────────────────
        if (body.startsWith(settings.prefix)) {
          await handleCommand(sock, userId, jid, body, settings.prefix, sentAt, msg, settings.mode);
          continue;
        }

        // ── Auto-reply (DMs only) ─────────────────────────────────────────────
        if (settings.autoReply && !msg.key.fromMe && !isGroup) {
          try {
            await sock.sendMessage(jid, {
              text: settings.autoReplyMessage || "I'm currently unavailable. Please try later.",
            });
          } catch {}
        }

      } catch (err) {
        console.error("[whatsapp] Error processing message:", err);
      }
    }
  });

  return sock;
}

// ─── Auto-reconnect on server startup ─────────────────────────────────────────

export async function reconnectAllSavedSessions() {
  try {
    const saved = await db.select().from(whatsappAuthTable);
    if (saved.length === 0) return;

    for (const row of saved) {
      if (!row.creds) continue;

      const entry = getOrCreateEntry(row.userId);
      if (entry.socket) continue;

      startSocket(row.userId, entry).catch((err) => {
        console.error(`[whatsapp] Failed to reconnect session for ${row.userId}:`, err);
      });

      // Stagger reconnections to avoid hammering WhatsApp
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.error("[whatsapp] Auto-reconnect error:", err);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function requestQRCode(userId: string) {
  const entry = getOrCreateEntry(userId);

  if (entry.status === "online") return { qrCode: null, status: "online" as const };

  if (!entry.socket) {
    await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Read QR from DB — it's never stored in memory
  const [row] = await db.select({ qrCode: botsTable.qrCode })
    .from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
  const qrCode = row?.qrCode ?? null;

  return { qrCode, status: qrCode ? ("connecting" as const) : entry.status };
}

export async function requestPairingCode(userId: string, phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 7) throw new Error("Invalid phone number");

  // Reject if already fully connected
  const existing = activeSessions.get(userId);
  if (existing?.status === "online") throw new Error("Already connected");

  // Tear down any existing socket — pairing code requires a fresh unauthenticated session
  if (existing?.socket) {
    clearKeepalive(existing);
    try { existing.socket.end(undefined); } catch {}
    existing.socket = null;
    existing.status = "offline";
  }
  activeSessions.delete(userId);

  // Wipe stored credentials so Baileys treats this as a brand-new device
  await clearDatabaseAuthState(userId);

  // Start a fresh socket in pairing mode.
  // pairingMode=true tells the connection.update close handler to NOT
  // auto-reconnect (WhatsApp briefly drops the socket during pairing handshake
  // which would otherwise kill the pairing code we're about to generate).
  const entry = getOrCreateEntry(userId);
  entry.pairingMode = true;
  const sock = await startSocket(userId, entry);

  // Wait until the noise-protocol handshake is done (before pair-device arrives).
  // We emit 'CB:noise-ready' from socket.js right after noise.finishInit() so we
  // can call requestPairingCode while WA's session is still in an unlocked state —
  // before it sends pair-device and transitions to QR mode server-side.
  await new Promise<void>((resolve, reject) => {
    const MAX_WAIT_MS = 20_000; // 20 s hard cap

    const timer = setTimeout(() => {
      sock.ev.off("CB:noise-ready" as any, onReady);
      sock.ev.off("connection.update", onClose);
      reject(new Error("Timed out waiting for WhatsApp handshake"));
    }, MAX_WAIT_MS);

    function onReady() {
      clearTimeout(timer);
      sock.ev.off("CB:noise-ready" as any, onReady);
      sock.ev.off("connection.update", onClose);
      resolve();
    }

    function onClose(update: any) {
      if (update.connection === "close") {
        clearTimeout(timer);
        sock.ev.off("CB:noise-ready" as any, onReady);
        sock.ev.off("connection.update", onClose);
        reject(new Error("Socket closed before handshake completed"));
      }
    }

    sock.ev.on("CB:noise-ready" as any, onReady);
    sock.ev.on("connection.update", onClose);
  });

  try {
    console.log(`[pairing] Calling requestPairingCode for userId=${userId} phone=${cleanPhone}`);
    const raw = await sock.requestPairingCode(cleanPhone);
    // Format as XXXX-XXXX for clarity (Baileys returns 8 chars without dash)
    const code = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
    console.log(`[pairing] Code generated for userId=${userId}: ${code} (raw=${raw}). Waiting for user to enter on phone…`);
    return code;
  } catch (err: any) {
    console.error(`[pairing] requestPairingCode FAILED for userId=${userId}:`, err);
    // Clean up on failure
    entry.socket = null;
    entry.status = "offline";
    activeSessions.delete(userId);
    throw new Error(err.message || "Failed to generate pairing code");
  }
}

export async function disconnectSession(userId: string) {
  const entry = activeSessions.get(userId);
  if (entry?.socket) {
    clearKeepalive(entry);
    try { await entry.socket.logout(); } catch {}
    entry.socket = null;
    entry.status = "offline";
  }
  activeSessions.delete(userId);
  await clearDatabaseAuthState(userId);
  try {
    await db.update(botsTable).set({ status: "offline", phoneNumber: null, qrCode: null })
      .where(eq(botsTable.userId, userId));
    if (typeof global.gc === "function") global.gc();
  } catch {}
}

export function getSessionStatus(userId: string): "offline" | "connecting" | "online" {
  return activeSessions.get(userId)?.status ?? "offline";
}
