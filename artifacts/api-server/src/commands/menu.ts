import type { CommandContext } from "./context";

export async function menuCommand(ctx: CommandContext) {
  const { sock, jid, prefix, pushName } = ctx;
  const date = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const menu =
    `╔═════════════════╗\n` +
    `║   ℕ𝕌𝕋𝕋𝔼ℝ-𝕏𝕄𝔻          ║\n` +
    `╚═════════════════╝\n\n` +
    `*📍 PREFIX:* ${prefix}\n` +
    `*👤 USER:* ${pushName}\n` +
    `*📅 DATE:* ${date}\n\n` +
    `╔══[ 🧠 *AI MENU* ]══╗\n` +
    `│ ${prefix}gpt │ ${prefix}gemini │ ${prefix}blackbox\n` +
    `│ ${prefix}deepseek │ ${prefix}code │ ${prefix}analyze\n` +
    `│ ${prefix}summarize │ ${prefix}translate │ ${prefix}recipe\n` +
    `│ ${prefix}story │ ${prefix}teach │ ${prefix}generate\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 🔊 *AUDIO* ]══╗\n` +
    `│ ${prefix}bass │ ${prefix}earrape │ ${prefix}reverse\n` +
    `│ ${prefix}robot │ ${prefix}deep │ ${prefix}tomp3 │ ${prefix}toptt\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ ⬇️ *DOWNLOAD* ]══╗\n` +
    `│ ${prefix}tiktok │ ${prefix}instagram │ ${prefix}facebook\n` +
    `│ ${prefix}twitter │ ${prefix}youtube │ ${prefix}song\n` +
    `│ ${prefix}mediafire │ ${prefix}gdrive │ ${prefix}image\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 😂 *FUN* ]══╗\n` +
    `│ ${prefix}fact │ ${prefix}jokes │ ${prefix}quotes\n` +
    `│ ${prefix}trivia │ ${prefix}truth │ ${prefix}dare\n` +
    `│ ${prefix}truthordare\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 🎮 *GAMES* ]══╗\n` +
    `│ ${prefix}dare │ ${prefix}truth │ ${prefix}truthordare\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 👥 *GROUP* ]══╗\n` +
    `│ ${prefix}kick │ ${prefix}promote │ ${prefix}demote │ ${prefix}add\n` +
    `│ ${prefix}invite │ ${prefix}open │ ${prefix}close │ ${prefix}poll\n` +
    `│ ${prefix}tagall │ ${prefix}hidetag │ ${prefix}kickall\n` +
    `│ ${prefix}setgroupname │ ${prefix}setdesc\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ ⚙️ *OTHER* ]══╗\n` +
    `│ ${prefix}botstatus │ ${prefix}ping │ ${prefix}runtime\n` +
    `│ ${prefix}time │ ${prefix}repo │ ${prefix}disk │ ${prefix}pair\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 👑 *OWNER* ]══╗\n` +
    `│ ${prefix}block │ ${prefix}unblock │ ${prefix}delete\n` +
    `│ ${prefix}warn │ ${prefix}join │ ${prefix}leave │ ${prefix}online\n` +
    `│ ${prefix}setbio │ ${prefix}setprefix │ ${prefix}restart\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 🔍 *SEARCH* ]══╗\n` +
    `│ ${prefix}weather │ ${prefix}define │ ${prefix}imdb\n` +
    `│ ${prefix}lyrics │ ${prefix}yts │ ${prefix}shazam\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ ⚙️ *SETTINGS* ]══╗\n` +
    `│ ${prefix}getsettings │ ${prefix}anticall\n` +
    `│ ${prefix}chatbot │ ${prefix}autotype │ ${prefix}autoread\n` +
    `│ ${prefix}antidelete │ ${prefix}alwaysonline\n` +
    `│ ${prefix}mode │ ${prefix}setprefix │ ${prefix}setwelcome\n` +
    `╚══════════════════╝\n\n` +
    `╔══[ 🛠️ *TOOLS* ]══╗\n` +
    `│ ${prefix}calculate │ ${prefix}fancy │ ${prefix}fliptext\n` +
    `│ ${prefix}genpass │ ${prefix}qrcode │ ${prefix}tinyurl\n` +
    `│ ${prefix}say │ ${prefix}device │ ${prefix}getpp\n` +
    `│ ${prefix}sticker │ ${prefix}emojimix\n` +
    `│ ${prefix}vv _(reply to view-once to reveal)_\n` +
    `╚══════════════════╝\n\n` +
    `> _Powered by *NUTTER-XMD* ⚡_`;

  await sock.sendMessage(jid, { text: menu });
}
