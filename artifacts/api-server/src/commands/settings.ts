import { eq } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";
import { invalidateBotSettingsCache } from "../lib/whatsapp.js";
import type { CommandContext } from "./context";

async function getBot(userId: string) {
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
  return bot;
}

async function updateBot(userId: string, data: Partial<typeof botsTable.$inferInsert>) {
  await db.update(botsTable).set(data).where(eq(botsTable.userId, userId));
  invalidateBotSettingsCache(userId);
}

function onOff(v: boolean | null | undefined) {
  return v ? "ON ✅" : "OFF ❌";
}

function resolveOnOff(arg: string | undefined, current: boolean): boolean {
  if (arg === "on") return true;
  if (arg === "off") return false;
  return !current;
}

// ── Settings overview ─────────────────────────────────────────────────────────
export async function getsettingsCommand(ctx: CommandContext) {
  try {
    const bot = await getBot(ctx.userId);
    if (!bot) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Bot not found." });
    await ctx.sock.sendMessage(ctx.jid, {
      text:
        `╔══[ ⚙️ *BOT SETTINGS* ]══╗\n\n` +
        `🔑 *Prefix:* ${bot.prefix}\n` +
        `🌐 *Mode:* ${bot.mode}\n\n` +
        `*── Protection ──*\n` +
        `${onOff(bot.antiCall)} Anti Call\n` +
        `${onOff(bot.antiLink)} Anti Link\n` +
        `${onOff(bot.antiSticker)} Anti Sticker\n` +
        `${onOff(bot.antiTag)} Anti Tag\n` +
        `${onOff(bot.antiBadWord)} Anti Bad Word\n` +
        `${onOff(bot.antiSpam)} Anti Spam\n` +
        `${onOff(bot.antiDelete)} Anti Delete\n\n` +
        `*── Group ──*\n` +
        `${onOff(bot.welcomeMessage)} Welcome Message\n` +
        `${onOff(bot.goodbyeMessage)} Goodbye Message\n\n` +
        `*── Automation ──*\n` +
        `${onOff(bot.autoReply)} Auto Reply\n` +
        `${onOff(bot.autoRead)} Auto Read\n\n` +
        `*── Presence ──*\n` +
        `${onOff(bot.typingStatus)} Typing Indicator\n` +
        `${onOff(bot.alwaysOnline)} Always Online\n` +
        `${onOff(bot.autoViewStatus)} Auto View Status\n` +
        `${onOff(bot.autoLikeStatus)} Auto Like Status\n` +
        `❤️ Status Like Emojis: ${(bot.statusLikeEmoji ?? "❤️").split(",").map(e=>e.trim()).join(" ")}\n\n` +
        `╚══════════════════╝\n\n` +
        `_Use_ \`${bot.prefix}<setting> on/off\` _to toggle any feature_\n` +
        `_Example:_ \`${bot.prefix}anticall on\``,
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to fetch settings." });
  }
}

// ── Anti Call ─────────────────────────────────────────────────────────────────
export async function anticallCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiCall ?? false);
  await updateBot(ctx.userId, { antiCall: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `📵 *Anti Call* is now *${onOff(newVal)}*\n\n_${newVal ? "Incoming calls will be rejected." : "Calls are now allowed."}_`,
  });
}

// ── Anti Sticker ──────────────────────────────────────────────────────────────
export async function antistickerCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiSticker ?? false);
  await updateBot(ctx.userId, { antiSticker: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🚫 *Anti Sticker* is now *${onOff(newVal)}*\n\n_${newVal ? "Stickers will be auto-deleted in groups (bot must be admin)." : "Stickers are now allowed."}_`,
  });
}

// ── Anti Link ─────────────────────────────────────────────────────────────────
export async function antilinkCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiLink ?? false);
  await updateBot(ctx.userId, { antiLink: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🔗 *Anti Link* is now *${onOff(newVal)}*\n\n_${newVal ? "Links will be deleted in groups (bot must be admin)." : "Links are now allowed."}_`,
  });
}

// ── Anti Tag ──────────────────────────────────────────────────────────────────
export async function antitagCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiTag ?? false);
  await updateBot(ctx.userId, { antiTag: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🏷️ *Anti Tag* is now *${onOff(newVal)}*\n\n_${newVal ? "Anyone who mentions this group in their status will have the message deleted and be kicked (bot must be admin)." : "Anti-tag disabled."}_`,
  });
}

// ── Anti Bad Word ─────────────────────────────────────────────────────────────
export async function antibadwordCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiBadWord ?? false);
  await updateBot(ctx.userId, { antiBadWord: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `🤬 *Anti Bad Word* is now *${onOff(newVal)}*\n\n` +
      (newVal
        ? `_Messages with bad words will be deleted and the user kicked (bot must be admin)._\n_Use_ \`${ctx.prefix}addbadword <word>\` _to add words to the filter._`
        : `_Bad word filter disabled._`),
  });
}

export async function addbadwordCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const word = ctx.argText.trim().toLowerCase();
  if (!word) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}addbadword <word>` });
  const bot = await getBot(ctx.userId);
  const existing = (bot?.badWords ?? "").split(",").map((w) => w.trim()).filter(Boolean);
  if (existing.includes(word)) {
    return ctx.sock.sendMessage(ctx.jid, { text: `⚠️ *"${word}"* is already in the bad words list.` });
  }
  existing.push(word);
  await updateBot(ctx.userId, { badWords: existing.join(",") });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `✅ Added *"${word}"* to the bad words list.\n\n📋 Total: ${existing.length} word(s)`,
  });
}

export async function removebadwordCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const word = ctx.argText.trim().toLowerCase();
  if (!word) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}removebadword <word>` });
  const bot = await getBot(ctx.userId);
  const existing = (bot?.badWords ?? "").split(",").map((w) => w.trim()).filter(Boolean);
  const updated = existing.filter((w) => w !== word);
  if (updated.length === existing.length) {
    return ctx.sock.sendMessage(ctx.jid, { text: `⚠️ *"${word}"* not found in the bad words list.` });
  }
  await updateBot(ctx.userId, { badWords: updated.join(",") });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `✅ Removed *"${word}"* from the bad words list.\n\n📋 Remaining: ${updated.length} word(s)`,
  });
}

export async function listbadwordsCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const words = (bot?.badWords ?? "").split(",").map((w) => w.trim()).filter(Boolean);
  if (words.length === 0) {
    return ctx.sock.sendMessage(ctx.jid, {
      text: `📋 *Bad Words List*\n\nNo bad words set. Use ${ctx.prefix}addbadword <word> to add one.`,
    });
  }
  await ctx.sock.sendMessage(ctx.jid, {
    text: `📋 *Bad Words List* (${words.length})\n\n${words.map((w, i) => `${i + 1}. ${w}`).join("\n")}`,
  });
}

// ── Chatbot / auto-reply ──────────────────────────────────────────────────────
export async function chatbotCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.autoReply ?? false);
  await updateBot(ctx.userId, { autoReply: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🤖 *Chatbot (Auto Reply)* is now *${onOff(newVal)}*`,
  });
}

// ── Auto type ─────────────────────────────────────────────────────────────────
export async function autotypeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.typingStatus ?? false);
  await updateBot(ctx.userId, { typingStatus: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `⌨️ *Typing Indicator* is now *${onOff(newVal)}*`,
  });
}

// ── Auto read ─────────────────────────────────────────────────────────────────
export async function autoreadCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.autoRead ?? false);
  await updateBot(ctx.userId, { autoRead: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `👁️ *Auto Read* is now *${onOff(newVal)}*`,
  });
}

// ── Anti delete ───────────────────────────────────────────────────────────────
export async function antideleteCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.antiDelete ?? false);
  await updateBot(ctx.userId, { antiDelete: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `🛡️ *Anti Delete* is now *${onOff(newVal)}*\n\n` +
      (newVal
        ? `_Deleted messages will be forwarded to your DM._`
        : `_Anti delete disabled._`),
  });
}

// ── Always online ─────────────────────────────────────────────────────────────
export async function alwaysonlineCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.alwaysOnline ?? false);
  await updateBot(ctx.userId, { alwaysOnline: newVal });
  if (newVal) {
    try { await ctx.sock.sendPresenceUpdate("available"); } catch {}
  }
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🟢 *Always Online* is now *${onOff(newVal)}*`,
  });
}

// ── Auto view status ──────────────────────────────────────────────────────────
export async function autoviewstatusCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.autoViewStatus ?? false);
  await updateBot(ctx.userId, { autoViewStatus: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `👀 *Auto View Status* is now *${onOff(newVal)}*\n\n` +
      (newVal ? `_Bot will automatically view all contacts' status updates._` : `_Status auto-view disabled._`),
  });
}

// ── Auto like status ──────────────────────────────────────────────────────────
export async function autolikestatusCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.autoLikeStatus ?? false);
  await updateBot(ctx.userId, { autoLikeStatus: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `❤️ *Auto Like Status* is now *${onOff(newVal)}*\n\n` +
      (newVal ? `_Bot will react ${(bot?.statusLikeEmoji ?? "❤️").split(",").map(e=>e.trim()).join(" ")} to all contacts' status updates._` : `_Status auto-like disabled._`),
  });
}

// ── Set status emoji ──────────────────────────────────────────────────────────
export async function setlikeemojiCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const raw = ctx.argText.trim();
  if (!raw) return ctx.sock.sendMessage(ctx.jid, {
    text: `❓ Usage: ${ctx.prefix}setlikeemoji <emoji1,emoji2,...>\n` +
          `Example: ${ctx.prefix}setlikeemoji 😅,💀,🔥\n` +
          `_Up to 5 emojis separated by commas._`,
  });
  const emojis = raw.split(",").map(e => e.trim()).filter(Boolean).slice(0, 5);
  if (emojis.length === 0) return ctx.sock.sendMessage(ctx.jid, { text: "❌ No valid emojis provided." });
  const stored = emojis.join(",");
  await updateBot(ctx.userId, { statusLikeEmoji: stored });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `✅ Status like emoji(s) set to: ${emojis.join(" ")}`,
  });
}

// ── Mode ──────────────────────────────────────────────────────────────────────
export async function modeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const mode = ctx.args[0]?.toLowerCase();
  if (!mode || !["public", "private"].includes(mode)) {
    return ctx.sock.sendMessage(ctx.jid, {
      text:
        `❓ Usage: ${ctx.prefix}mode <public|private>\n\n` +
        `_• public — everyone can use bot commands._\n` +
        `_• private — only the owner can use commands._`,
    });
  }
  await updateBot(ctx.userId, { mode });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `🌐 *Bot mode* set to *${mode.toUpperCase()}*\n\n_${mode === "public" ? "Everyone can use bot commands." : "Only the owner can use bot commands."}_`,
  });
}

// ── Set prefix ────────────────────────────────────────────────────────────────
export async function setPrefixCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const newPrefix = ctx.args[0];
  if (!newPrefix || newPrefix.length > 3) {
    return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setprefix <symbol>` });
  }
  await updateBot(ctx.userId, { prefix: newPrefix });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `✅ Prefix changed to: *${newPrefix}*\n\nAll commands now use: ${newPrefix}ping, ${newPrefix}menu, etc.`,
  });
}

// ── Welcome message ───────────────────────────────────────────────────────────
export async function setwelcomeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.welcomeMessage ?? false);
  await updateBot(ctx.userId, { welcomeMessage: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `🎉 *Welcome Message* is now *${onOff(newVal)}*\n\n` +
      (newVal
        ? `_New members will be greeted with their profile picture and a welcome caption._`
        : `_Welcome messages disabled._`),
  });
}

// ── Goodbye message ───────────────────────────────────────────────────────────
export async function setgoodbyeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const bot = await getBot(ctx.userId);
  const newVal = resolveOnOff(ctx.args[0], bot?.goodbyeMessage ?? false);
  await updateBot(ctx.userId, { goodbyeMessage: newVal });
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `👋 *Goodbye Message* is now *${onOff(newVal)}*\n\n` +
      (newVal
        ? `_A farewell message will be sent when members leave the group._`
        : `_Goodbye messages disabled._`),
  });
}
