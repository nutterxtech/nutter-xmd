import type { CommandContext } from "./context";

function getMentioned(ctx: CommandContext): string[] {
  return ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
}

export async function kickCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const mentioned = getMentioned(ctx);
  if (!mentioned.length) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}kick @user` });
  try {
    await ctx.sock.groupParticipantsUpdate(ctx.jid, mentioned, "remove");
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Kicked ${mentioned.map((j) => `@${j.split("@")[0]}`).join(", ")}`, mentions: mentioned });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to kick. Make sure I'm an admin." });
  }
}

export async function promoteCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const mentioned = getMentioned(ctx);
  if (!mentioned.length) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}promote @user` });
  try {
    await ctx.sock.groupParticipantsUpdate(ctx.jid, mentioned, "promote");
    await ctx.sock.sendMessage(ctx.jid, { text: `👑 Promoted ${mentioned.map((j) => `@${j.split("@")[0]}`).join(", ")} to admin!`, mentions: mentioned });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to promote. Make sure I'm an admin." });
  }
}

export async function demoteCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const mentioned = getMentioned(ctx);
  if (!mentioned.length) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}demote @user` });
  try {
    await ctx.sock.groupParticipantsUpdate(ctx.jid, mentioned, "demote");
    await ctx.sock.sendMessage(ctx.jid, { text: `⬇️ Demoted ${mentioned.map((j) => `@${j.split("@")[0]}`).join(", ")} from admin.`, mentions: mentioned });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to demote. Make sure I'm an admin." });
  }
}

export async function addCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const number = ctx.args[0]?.replace(/[^0-9]/g, "");
  if (!number) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}add <phone number>` });
  const jid = `${number}@s.whatsapp.net`;
  try {
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [jid], "add");
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Added +${number} to the group!` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to add. Make sure I'm an admin and the number is valid." });
  }
}

export async function inviteCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  try {
    const code = await ctx.sock.groupInviteCode(ctx.jid);
    await ctx.sock.sendMessage(ctx.jid, { text: `🔗 *Group Invite Link:*\n\nhttps://chat.whatsapp.com/${code}` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to get invite link. Make sure I'm an admin." });
  }
}

export async function openCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  try {
    await ctx.sock.groupSettingUpdate(ctx.jid, "not_announcement");
    await ctx.sock.sendMessage(ctx.jid, { text: "🔓 *Group is now OPEN* — Everyone can send messages." });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed. Make sure I'm an admin." });
  }
}

export async function closeCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  try {
    await ctx.sock.groupSettingUpdate(ctx.jid, "announcement");
    await ctx.sock.sendMessage(ctx.jid, { text: "🔒 *Group is now CLOSED* — Only admins can send messages." });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed. Make sure I'm an admin." });
  }
}

export async function pollCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  const parts = ctx.argText.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}poll Question | Option1 | Option2 | Option3` });
  const [question, ...options] = parts;
  try {
    await ctx.sock.sendMessage(ctx.jid, {
      poll: { name: question, values: options.slice(0, 12), selectableCount: 1 },
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to create poll." });
  }
}

export async function tagallCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  try {
    const meta = await ctx.sock.groupMetadata(ctx.jid);
    const members = meta.participants.map((p) => p.id);
    const mentions = members.map((j) => `@${j.split("@")[0]}`).join(" ");
    const text = ctx.argText ? `📢 *${ctx.argText}*\n\n${mentions}` : `📢 *Attention everyone!*\n\n${mentions}`;
    await ctx.sock.sendMessage(ctx.jid, { text, mentions: members });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to tag all. Make sure I'm an admin." });
  }
}

export async function hidetagCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  if (!ctx.argText) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}hidetag <message>` });
  try {
    const meta = await ctx.sock.groupMetadata(ctx.jid);
    const members = meta.participants.map((p) => p.id);
    await ctx.sock.sendMessage(ctx.jid, { text: ctx.argText, mentions: members });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed." });
  }
}

export async function kickallCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  if (!ctx.isOwner) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Only the bot owner can use this command." });
  try {
    const meta = await ctx.sock.groupMetadata(ctx.jid);
    const botId = ctx.botJid.split(":")[0] + "@s.whatsapp.net";
    const nonAdmins = meta.participants.filter((p) => !p.admin && p.id !== botId).map((p) => p.id);
    if (!nonAdmins.length) return ctx.sock.sendMessage(ctx.jid, { text: "ℹ️ No non-admin members to kick." });
    await ctx.sock.groupParticipantsUpdate(ctx.jid, nonAdmins, "remove");
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Kicked ${nonAdmins.length} member(s).` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to kick all. Make sure I'm an admin." });
  }
}

export async function setgroupnameCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  if (!ctx.argText) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setgroupname <name>` });
  try {
    await ctx.sock.groupUpdateSubject(ctx.jid, ctx.argText);
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Group name updated to: *${ctx.argText}*` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed. Make sure I'm an admin." });
  }
}

export async function setdescCommand(ctx: CommandContext) {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: "❌ This command only works in groups." });
  if (!ctx.argText) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}setdesc <description>` });
  try {
    await ctx.sock.groupUpdateDescription(ctx.jid, ctx.argText);
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Group description updated!` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed. Make sure I'm an admin." });
  }
}
