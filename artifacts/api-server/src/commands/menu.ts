import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CommandContext } from "./context";

function getBanner(): Buffer | null {
  try {
    const assetPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "assets/menu-banner.jpg"
    );
    return readFileSync(assetPath);
  } catch {
    return null;
  }
}

export async function menuCommand(ctx: CommandContext) {
  const { sock, jid, prefix, pushName, senderJid } = ctx;

  const p = prefix;
  const phone = senderJid.split("@")[0];
  const date = new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const menu =
    `╰► Hey @${phone} 👾\n` +
    `╭───〔 *NUTTER-XMD* 〕──────┈\n` +
    `├──────────────\n` +
    `│✵│▸ 𝐓𝐎𝐓𝐀𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒: 103\n` +
    `│✵│▸ 𝐏𝐑𝐄𝐅𝐈𝐗: ${p}\n` +
    `│✵│▸ 𝐔𝐒𝐄𝐑: ${pushName}\n` +
    `│✵│▸ 𝐃𝐀𝐓𝐄: ${date}\n` +
    `╰──────────────────────⊷\n\n` +

    `╭─────「 🤖 AI 」───┈⊷\n` +
    `││◦➛ ${p}gpt\n` +
    `││◦➛ ${p}gemini\n` +
    `││◦➛ ${p}deepseek\n` +
    `││◦➛ ${p}blackbox\n` +
    `││◦➛ ${p}code\n` +
    `││◦➛ ${p}analyze\n` +
    `││◦➛ ${p}summarize\n` +
    `││◦➛ ${p}translate\n` +
    `││◦➛ ${p}recipe\n` +
    `││◦➛ ${p}story\n` +
    `││◦➛ ${p}teach\n` +
    `││◦➛ ${p}generate\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 ⬇️ DOWNLOADS 」───┈⊷\n` +
    `││◦➛ ${p}youtube\n` +
    `││◦➛ ${p}song\n` +
    `││◦➛ ${p}tiktok\n` +
    `││◦➛ ${p}instagram\n` +
    `││◦➛ ${p}twitter\n` +
    `││◦➛ ${p}facebook\n` +
    `││◦➛ ${p}gdrive\n` +
    `││◦➛ ${p}mediafire\n` +
    `││◦➛ ${p}image\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 🔊 AUDIO 」───┈⊷\n` +
    `││◦➛ ${p}tomp3\n` +
    `││◦➛ ${p}toptt\n` +
    `││◦➛ ${p}bass\n` +
    `││◦➛ ${p}earrape\n` +
    `││◦➛ ${p}reverse\n` +
    `││◦➛ ${p}robot\n` +
    `││◦➛ ${p}deep\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 😄 FUN 」───┈⊷\n` +
    `││◦➛ ${p}fact\n` +
    `││◦➛ ${p}jokes\n` +
    `││◦➛ ${p}quotes\n` +
    `││◦➛ ${p}trivia\n` +
    `││◦➛ ${p}truth\n` +
    `││◦➛ ${p}dare\n` +
    `││◦➛ ${p}truthordare\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 🔍 SEARCH 」───┈⊷\n` +
    `││◦➛ ${p}weather\n` +
    `││◦➛ ${p}define\n` +
    `││◦➛ ${p}imdb\n` +
    `││◦➛ ${p}lyrics\n` +
    `││◦➛ ${p}yts\n` +
    `││◦➛ ${p}shazam\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 🛠️ TOOLS 」───┈⊷\n` +
    `││◦➛ ${p}sticker\n` +
    `││◦➛ ${p}emojimix\n` +
    `││◦➛ ${p}qrcode\n` +
    `││◦➛ ${p}tinyurl\n` +
    `││◦➛ ${p}calculate\n` +
    `││◦➛ ${p}genpass\n` +
    `││◦➛ ${p}say\n` +
    `││◦➛ ${p}getpp\n` +
    `││◦➛ ${p}fancy\n` +
    `││◦➛ ${p}fliptext\n` +
    `││◦➛ ${p}device\n` +
    `││◦➛ ${p}disk\n` +
    `││◦➛ ${p}ping\n` +
    `││◦➛ ${p}runtime\n` +
    `││◦➛ ${p}time\n` +
    `││◦➛ ${p}repo\n` +
    `││◦➛ ${p}botstatus\n` +
    `││◦➛ ${p}vv\n` +
    `││◦➛ ${p}vv2\n` +
    `││◦➛ ${p}test\n` +
    `││◦➛ ${p}alive\n` +
    `││◦➛ ${p}pair\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 👥 GROUP 」───┈⊷\n` +
    `││◦➛ ${p}kick\n` +
    `││◦➛ ${p}promote\n` +
    `││◦➛ ${p}demote\n` +
    `││◦➛ ${p}add\n` +
    `││◦➛ ${p}approve\n` +
    `││◦➛ ${p}invite\n` +
    `││◦➛ ${p}open\n` +
    `││◦➛ ${p}close\n` +
    `││◦➛ ${p}poll\n` +
    `││◦➛ ${p}tagall\n` +
    `││◦➛ ${p}hidetag\n` +
    `││◦➛ ${p}kickall\n` +
    `││◦➛ ${p}setgroupname\n` +
    `││◦➛ ${p}setdesc\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 ⚙️ SETTINGS 」───┈⊷\n` +
    `││◦➛ ${p}anticall\n` +
    `││◦➛ ${p}antilink\n` +
    `││◦➛ ${p}antisticker\n` +
    `││◦➛ ${p}antitag\n` +
    `││◦➛ ${p}antibadword\n` +
    `││◦➛ ${p}chatbot\n` +
    `││◦➛ ${p}autoread\n` +
    `││◦➛ ${p}alwaysonline\n` +
    `││◦➛ ${p}autoviewstatus\n` +
    `││◦➛ ${p}autolikestatus\n` +
    `││◦➛ ${p}autotype\n` +
    `││◦➛ ${p}antidelete\n` +
    `││◦➛ ${p}setlikeemoji\n` +
    `││◦➛ ${p}mode\n` +
    `││◦➛ ${p}setprefix\n` +
    `││◦➛ ${p}setwelcome\n` +
    `││◦➛ ${p}setgoodbye\n` +
    `││◦➛ ${p}getsettings\n` +
    `╰──────────────┈⊷\n\n` +

    `╭─────「 👑 OWNER 」───┈⊷\n` +
    `││◦➛ ${p}block\n` +
    `││◦➛ ${p}unblock\n` +
    `││◦➛ ${p}delete\n` +
    `││◦➛ ${p}warn\n` +
    `││◦➛ ${p}join\n` +
    `││◦➛ ${p}leave\n` +
    `││◦➛ ${p}online\n` +
    `││◦➛ ${p}setbio\n` +
    `││◦➛ ${p}restart\n` +
    `╰──────────────┈⊷\n\n` +

    `_Powered by *NUTTER-XMD* ⚡_\n` +
    `_Type ${p}<command> to run_`;

  const banner = getBanner();

  if (banner) {
    await sock.sendMessage(jid, {
      image: banner,
      caption: menu,
      mimetype: "image/jpeg",
      mentions: [senderJid],
    });
  } else {
    await sock.sendMessage(jid, { text: menu, mentions: [senderJid] });
  }
}
