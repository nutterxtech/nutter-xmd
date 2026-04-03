import { eq } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";
import type { CommandContext } from "./context";

async function getBot(userId: string) {
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.userId, userId)).limit(1);
  return bot;
}

async function updateBot(userId: string, data: Partial<typeof botsTable.$inferInsert>) {
  await db.update(botsTable).set(data).where(eq(botsTable.userId, userId));
}

export async function getsettingsCommand(ctx: CommandContext) {
  try {
    const bot = await getBot(ctx.userId);
    if (!bot) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Bot not found." });
    const on = "✅", off = "❌";
    await ctx.sock.sendMessage(ctx.jid, {
      text:
        `╔══[ ⚙️ *BOT SETTINGS* ]══╗\n\n` +
        `🔑 *Prefix:* ${bot.prefix}\n` +
        `🌐 *Mode:* ${bot.mode}\n\n` +
        `${bot.antiCall ? on : off} Anti Call\n` +
        `${bot.antiLink ? on : off} Anti Link\n` +
        `${bot.antiSpam ? on : off} Anti Spam\n` +
        `${bot.welcomeMessage ? on : off} Welcome Message\n` +
        `${bot.goodbyeMessage ? on : off} Goodbye Message\n` +
        `${bot.autoReply ? on : off} Auto Reply\n` +
        `${bot.autoRead ? on : off} Auto Read\n` +
        `${bot.typingStatus ? on : off} Typing Status\n` +
        `${bot.alwaysOnline ? on : off} Always Online\n` +
        `${bot.autoStatus ? on : off} Auto Status\n\n` +
        `╚══════════════════╝`,
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to fetch settings." });
  }
}

export async function anticallCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = !bot?.antiCall;
  await updateBot(ctx.userId, { antiCall: newVal });
  await ctx.sock.sendMessage(ctx.jid, { text: `📵 Anti Call is now *${newVal ? "ON ✅" : "OFF ❌"}*` });
}

export async function chatbotCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = !bot?.autoReply;
  await updateBot(ctx.userId, { autoReply: newVal });
  await ctx.sock.sendMessage(ctx.jid, { text: `🤖 Chatbot is now *${newVal ? "ON ✅" : "OFF ❌"}*` });
}

export async function autotypeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = !bot?.typingStatus;
  await updateBot(ctx.userId, { typingStatus: newVal });
  await ctx.sock.sendMessage(ctx.jid, { text: `⌨️ Auto Typing is now *${newVal ? "ON ✅" : "OFF ❌"}*` });
}

export async function autoreadCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = !bot?.autoRead;
  await updateBot(ctx.userId, { autoRead: newVal });
  await ctx.sock.sendMessage(ctx.jid, { text: `👁️ Auto Read is now *${newVal ? "ON ✅" : "OFF ❌"}*` });
}

export async function antideleteCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  await ctx.sock.sendMessage(ctx.jid, { text: "🛡️ Anti Delete feature is available — toggle it from the bot dashboard Settings tab." });
}

export async function alwaysonlineCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bot = await getBot(ctx.userId);
  const newVal = !bot?.alwaysOnline;
  await updateBot(ctx.userId, { alwaysOnline: newVal });
  if (newVal) {
    await ctx.sock.sendPresenceUpdate("available");
  }
  await ctx.sock.sendMessage(ctx.jid, { text: `🟢 Always Online is now *${newVal ? "ON ✅" : "OFF ❌"}*` });
}

export async function modeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const mode = ctx.args[0]?.toLowerCase();
  if (!mode || !["public", "private"].includes(mode)) {
    return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}mode <public|private>` });
  }
  await updateBot(ctx.userId, { mode });
  await ctx.sock.sendMessage(ctx.jid, { text: `🌐 Bot mode set to *${mode.toUpperCase()}*\n\n_${mode === "public" ? "Everyone can use bot commands." : "Only the owner can use bot commands."}_` });
}

export async function setPrefixCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const newPrefix = ctx.args[0];
  if (!newPrefix || newPrefix.length > 3) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setprefix <symbol>` });
  await updateBot(ctx.userId, { prefix: newPrefix });
  await ctx.sock.sendMessage(ctx.jid, { text: `✅ Prefix changed to: *${newPrefix}*\n\nAll commands now use: ${newPrefix}ping, ${newPrefix}menu, etc.` });
}

export async function setwelcomeCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const msg = ctx.argText;
  if (!msg) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setwelcome <message>` });
  await updateBot(ctx.userId, { welcomeMessage: true, autoReplyMessage: msg });
  await ctx.sock.sendMessage(ctx.jid, { text: `✅ Welcome message set!\n\n_${msg}_` });
}
