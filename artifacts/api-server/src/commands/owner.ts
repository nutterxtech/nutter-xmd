import { eq } from "drizzle-orm";
import { db, botsTable } from "@workspace/db";
import type { CommandContext } from "./context";
import { disconnectSession } from "../lib/whatsapp";

export async function blockCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const number = ctx.args[0]?.replace(/[^0-9]/g, "");
  const target = mentioned ?? (number ? `${number}@s.whatsapp.net` : null);
  if (!target) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}block @user or ${ctx.prefix}block <number>` });
  try {
    await ctx.sock.updateBlockStatus(target, "block");
    await ctx.sock.sendMessage(ctx.jid, { text: `🚫 Blocked @${target.split("@")[0]}`, mentions: [target] });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to block." });
  }
}

export async function unblockCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const number = ctx.args[0]?.replace(/[^0-9]/g, "");
  if (!number) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}unblock <number>` });
  const target = `${number}@s.whatsapp.net`;
  try {
    await ctx.sock.updateBlockStatus(target, "unblock");
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Unblocked +${number}` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to unblock." });
  }
}

export async function deleteCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo;
  if (!quoted?.stanzaId) return ctx.sock.sendMessage(ctx.jid, { text: "❓ Reply to a message to delete it." });
  try {
    await ctx.sock.sendMessage(ctx.jid, {
      delete: {
        remoteJid: ctx.jid,
        fromMe: quoted.participant === ctx.botJid,
        id: quoted.stanzaId,
        participant: quoted.participant,
      },
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to delete message." });
  }
}

export async function warnCommand(ctx: CommandContext) {
  if (!ctx.isOwner && !ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}warn @user` });
  await ctx.sock.sendMessage(ctx.jid, {
    text: `⚠️ *WARNING* ⚠️\n\n@${mentioned.split("@")[0]}, you have been warned!\n_Continued violations may result in removal._`,
    mentions: [mentioned],
  });
}

export async function joinCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const link = ctx.args[0];
  if (!link) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}join <invite link>` });
  const code = link.split("chat.whatsapp.com/").pop()?.trim();
  if (!code) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Invalid WhatsApp invite link." });
  try {
    await ctx.sock.groupAcceptInvite(code);
    await ctx.sock.sendMessage(ctx.jid, { text: "✅ Joined group successfully!" });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to join group." });
  }
}

export async function leaveCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Use this in a group to make the bot leave." });
  await ctx.sock.sendMessage(ctx.jid, { text: "👋 Leaving this group. Goodbye!" });
  await new Promise((r) => setTimeout(r, 1000));
  try {
    await ctx.sock.groupLeave(ctx.jid);
  } catch {}
}

export async function onlineCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  try {
    await ctx.sock.sendPresenceUpdate("available", ctx.jid);
    await ctx.sock.sendMessage(ctx.jid, { text: "✅ Bot is now showing as *Online*" });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to update presence." });
  }
}

export async function setbioCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const bio = ctx.argText;
  if (!bio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setbio <text>` });
  try {
    await ctx.sock.updateProfileStatus(bio);
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Bio updated to: _${bio}_` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to update bio." });
  }
}

export async function setPrefixOwnerCommand(ctx: CommandContext, updatePrefix: (userId: string, prefix: string) => Promise<void>) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  const newPrefix = ctx.args[0];
  if (!newPrefix || newPrefix.length > 3) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setprefix <symbol>` });
  try {
    await updatePrefix(ctx.userId, newPrefix);
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Prefix changed to: *${newPrefix}*` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to update prefix." });
  }
}

export async function restartCommand(ctx: CommandContext) {
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only command." });
  await ctx.sock.sendMessage(ctx.jid, { text: "🔄 Restarting bot... Please wait." });
  await new Promise((r) => setTimeout(r, 1500));
  // Gracefully disconnect and reconnect
  try {
    await disconnectSession(ctx.userId);
  } catch {}
  setTimeout(() => {
    process.exit(0); // Server will restart via process manager
  }, 2000);
}
