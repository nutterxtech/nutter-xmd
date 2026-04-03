import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import type { CommandContext } from "./context";
import { menuCommand } from "./menu";
import { gptCommand, geminiCommand, blackboxCommand, deepseekCommand, codeCommand, analyzeCommand, summarizeCommand, translateCommand, recipeCommand, storyCommand, teachCommand, generateCommand } from "./ai";
import { factCommand, jokesCommand, quotesCommand, triviaCommand, truthCommand, dareCommand, truthOrDareCommand } from "./fun";
import { pingCommand, botstatusCommand, runtimeCommand, timeCommand, diskCommand, deviceCommand, repoCommand, calculateCommand, fancyCommand, fliptextCommand, genpassCommand, qrcodeCommand, tinyurlCommand, sayCommand, getppCommand, stickerCommand, vvCommand, pairCommand, emojimixCommand } from "./tools";
import { kickCommand, promoteCommand, demoteCommand, addCommand, inviteCommand, openCommand, closeCommand, pollCommand, tagallCommand, hidetagCommand, kickallCommand, setgroupnameCommand, setdescCommand } from "./group";
import { blockCommand, unblockCommand, deleteCommand, warnCommand, joinCommand, leaveCommand, onlineCommand, setbioCommand, setPrefixOwnerCommand, restartCommand } from "./owner";
import { weatherCommand, defineCommand, imdbCommand, lyricsCommand, ytsCommand, shazamCommand } from "./search";
import { getsettingsCommand, anticallCommand, chatbotCommand, autotypeCommand, autoreadCommand, antideleteCommand, alwaysonlineCommand, modeCommand, setPrefixCommand, setwelcomeCommand } from "./settings";
import { youtubeCommand, songCommand, tiktokCommand, instagramCommand, facebookCommand, twitterCommand, mediafireCommand, gdriveCommand, imageCommand } from "./download";
import { bassCommand, earrapeCommand, reverseCommand, robotCommand, deepCommand, tomp3Command, topttCommand } from "./audio";

async function updateBotPrefix(userId: string, prefix: string) {
  const { eq } = await import("drizzle-orm");
  const { db, botsTable } = await import("@workspace/db");
  await db.update(botsTable).set({ prefix }).where(eq(botsTable.userId, userId));
}

const COMMANDS: Record<string, (ctx: CommandContext) => Promise<unknown>> = {
  menu: menuCommand,
  help: menuCommand,
  // AI
  gpt: gptCommand,
  gemini: geminiCommand,
  blackbox: blackboxCommand,
  deepseek: deepseekCommand,
  code: codeCommand,
  analyze: analyzeCommand,
  analyse: analyzeCommand,
  summarize: summarizeCommand,
  translate: translateCommand,
  recipe: recipeCommand,
  story: storyCommand,
  teach: teachCommand,
  generate: generateCommand,
  // Fun
  fact: factCommand,
  jokes: jokesCommand,
  joke: jokesCommand,
  quotes: quotesCommand,
  quote: quotesCommand,
  trivia: triviaCommand,
  truth: truthCommand,
  dare: dareCommand,
  truthordare: truthOrDareCommand,
  tod: truthOrDareCommand,
  // Tools
  ping: pingCommand,
  botstatus: botstatusCommand,
  runtime: runtimeCommand,
  time: timeCommand,
  disk: diskCommand,
  device: deviceCommand,
  repo: repoCommand,
  calculate: calculateCommand,
  calc: calculateCommand,
  math: calculateCommand,
  fancy: fancyCommand,
  fliptext: fliptextCommand,
  flip: fliptextCommand,
  genpass: genpassCommand,
  password: genpassCommand,
  qrcode: qrcodeCommand,
  qr: qrcodeCommand,
  tinyurl: tinyurlCommand,
  shorten: tinyurlCommand,
  say: sayCommand,
  echo: sayCommand,
  getpp: getppCommand,
  pp: getppCommand,
  sticker: stickerCommand,
  s: stickerCommand,
  vv: vvCommand,
  pair: pairCommand,
  emojimix: emojimixCommand,
  // Group
  kick: kickCommand,
  promote: promoteCommand,
  demote: demoteCommand,
  add: addCommand,
  invite: inviteCommand,
  open: openCommand,
  close: closeCommand,
  poll: pollCommand,
  tagall: tagallCommand,
  hidetag: hidetagCommand,
  kickall: kickallCommand,
  setgroupname: setgroupnameCommand,
  setdesc: setdescCommand,
  // Owner
  block: blockCommand,
  unblock: unblockCommand,
  delete: deleteCommand,
  del: deleteCommand,
  warn: warnCommand,
  join: joinCommand,
  leave: leaveCommand,
  online: onlineCommand,
  setbio: setbioCommand,
  restart: restartCommand,
  // Settings
  getsettings: getsettingsCommand,
  settings: getsettingsCommand,
  anticall: anticallCommand,
  chatbot: chatbotCommand,
  autotype: autotypeCommand,
  autoread: autoreadCommand,
  antidelete: antideleteCommand,
  alwaysonline: alwaysonlineCommand,
  mode: modeCommand,
  setwelcome: setwelcomeCommand,
  // Search
  weather: weatherCommand,
  define: defineCommand,
  dictionary: defineCommand,
  imdb: imdbCommand,
  movie: imdbCommand,
  lyrics: lyricsCommand,
  yts: ytsCommand,
  shazam: shazamCommand,
  // Downloads
  youtube: youtubeCommand,
  yt: youtubeCommand,
  ytv: youtubeCommand,
  song: songCommand,
  play: songCommand,
  tiktok: tiktokCommand,
  tt: tiktokCommand,
  instagram: instagramCommand,
  ig: instagramCommand,
  facebook: facebookCommand,
  fb: facebookCommand,
  twitter: twitterCommand,
  tw: twitterCommand,
  mediafire: mediafireCommand,
  mf: mediafireCommand,
  gdrive: gdriveCommand,
  image: imageCommand,
  img: imageCommand,
  // Audio
  bass: bassCommand,
  earrape: earrapeCommand,
  reverse: reverseCommand,
  robot: robotCommand,
  deep: deepCommand,
  tomp3: tomp3Command,
  toptt: topttCommand,
};

// setprefix appears in both settings and owner — handle separately
async function handleSetPrefix(ctx: CommandContext) {
  if (ctx.isOwner) return setPrefixOwnerCommand(ctx, updateBotPrefix);
  return setPrefixCommand(ctx);
}

COMMANDS["setprefix"] = handleSetPrefix;

export async function handleCommand(
  sock: WASocket,
  userId: string,
  jid: string,
  text: string,
  prefix: string,
  sentAt: number,
  msg: WAMessage,
  botMode: string
): Promise<void> {
  const body = text.trim();
  if (!body.startsWith(prefix)) return;

  const withoutPrefix = body.slice(prefix.length);
  const parts = withoutPrefix.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const argText = args.join(" ");

  const handler = COMMANDS[cmd];
  if (!handler) return;

  const senderJid = msg.key.fromMe
    ? (sock.user?.id ?? "")
    : (msg.key.participant ?? msg.key.remoteJid ?? "");

  const botJid = sock.user?.id ?? "";
  const botNumber = botJid.split(":")[0].replace(/[^0-9]/g, "");
  const senderNumber = senderJid.split(":")[0].replace(/[^0-9]/g, "");
  const isOwner = msg.key.fromMe || (botNumber.length > 0 && senderNumber === botNumber);

  // Respect bot mode: if private, only owner can use commands
  if (botMode === "private" && !isOwner) return;

  const isGroup = jid.endsWith("@g.us");
  const pushName = msg.pushName ?? senderJid.split("@")[0];

  const ctx: CommandContext = {
    sock,
    userId,
    jid,
    msg,
    args,
    argText,
    prefix,
    isGroup,
    senderJid,
    pushName,
    isOwner,
    botJid,
  };

  try {
    await handler(ctx);
  } catch (err) {
    console.error(`[commands] Error in ${cmd}:`, err);
    await sock.sendMessage(jid, { text: `❌ Command \`${prefix}${cmd}\` failed. Please try again.` });
  }
}
