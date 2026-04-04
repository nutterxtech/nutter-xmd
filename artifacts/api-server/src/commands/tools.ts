import QRCode from "qrcode";
import axios from "axios";
import { execSync } from "child_process";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { CommandContext } from "./context";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let startTime = Date.now();
export function resetUptime() { startTime = Date.now(); }

const FANCY_MAP: Record<string, string> = {
  a: "𝕒", b: "𝕓", c: "𝕔", d: "𝕕", e: "𝕖", f: "𝕗", g: "𝕘", h: "𝕙", i: "𝕚",
  j: "𝕛", k: "𝕜", l: "𝕝", m: "𝕞", n: "𝕟", o: "𝕠", p: "𝕡", q: "𝕢", r: "𝕣",
  s: "𝕤", t: "𝕥", u: "𝕦", v: "𝕧", w: "𝕨", x: "𝕩", y: "𝕪", z: "𝕫",
  A: "𝔸", B: "𝔹", C: "ℂ", D: "𝔻", E: "𝔼", F: "𝔽", G: "𝔾", H: "ℍ", I: "𝕀",
  J: "𝕁", K: "𝕂", L: "𝕃", M: "𝕄", N: "ℕ", O: "𝕆", P: "ℙ", Q: "ℚ", R: "ℝ",
  S: "𝕊", T: "𝕋", U: "𝕌", V: "𝕍", W: "𝕎", X: "𝕏", Y: "𝕐", Z: "ℤ",
};

const FLIP_MAP: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ",
  j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ",
  s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  A: "∀", B: "𝐁", C: "Ɔ", D: "◖", E: "Ǝ", F: "Ⅎ", G: "פ", H: "H", I: "I",
  J: "ſ", K: "ʞ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Q", R: "ɹ",
  S: "S", T: "┴", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9",
  "7": "L", "8": "8", "9": "6", ".": "˙", ",": "'", "!": "¡", "?": "¿",
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Cache the banner buffer so we only read disk once per server lifecycle
let _bannerCache: Buffer | null | undefined;
function loadBanner(): Buffer | null {
  if (_bannerCache !== undefined) return _bannerCache;
  try {
    _bannerCache = readFileSync(join(__dirname, "../assets/menu-banner.jpg"));
  } catch {
    try {
      _bannerCache = readFileSync(join(process.cwd(), "dist/assets/menu-banner.jpg"));
    } catch {
      _bannerCache = null;
    }
  }
  return _bannerCache;
}

export async function pingCommand(ctx: CommandContext) {
  const start = Date.now();
  await ctx.sock.sendMessage(ctx.jid, { text: "🏓 Pinging..." });
  const latency = Date.now() - start;
  await ctx.sock.sendMessage(ctx.jid, { text: `🏓 *Pong!*\n\n⚡ Speed: *${latency}ms*\n✅ Status: Online` });
}

export async function botstatusCommand(ctx: CommandContext) {
  const uptime = formatDuration(Date.now() - startTime);
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `╔══[ 📊 *BOT STATUS* ]══╗\n\n` +
      `🟢 *Status:* Online\n` +
      `⏱️ *Uptime:* ${uptime}\n` +
      `🤖 *Bot:* NUTTER-XMD\n` +
      `📡 *Server:* Running\n` +
      `🔋 *Health:* Excellent\n\n` +
      `╚══════════════════╝`,
  });
}

export async function runtimeCommand(ctx: CommandContext) {
  const uptime = formatDuration(Date.now() - startTime);
  await ctx.sock.sendMessage(ctx.jid, { text: `⏱️ *Bot Runtime:* ${uptime}` });
}

export async function timeCommand(ctx: CommandContext) {
  const now = new Date();
  const formatted = now.toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  await ctx.sock.sendMessage(ctx.jid, { text: `🕐 *Current Time:*\n\n${formatted}` });
}

export async function diskCommand(ctx: CommandContext) {
  try {
    const output = execSync("df -h / 2>/dev/null").toString().split("\n")[1] ?? "";
    const parts = output.trim().split(/\s+/);
    await ctx.sock.sendMessage(ctx.jid, {
      text:
        `💾 *Disk Usage:*\n\n` +
        `📦 Total: ${parts[1] ?? "N/A"}\n` +
        `✅ Used: ${parts[2] ?? "N/A"}\n` +
        `🆓 Free: ${parts[3] ?? "N/A"}\n` +
        `📊 Usage: ${parts[4] ?? "N/A"}`,
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "💾 Disk info unavailable." });
  }
}

export async function deviceCommand(ctx: CommandContext) {
  const platform = process.platform;
  const nodeVersion = process.version;
  const uptime = formatDuration(process.uptime() * 1000);
  const mem = process.memoryUsage();
  const memUsed = Math.round(mem.heapUsed / 1024 / 1024);
  const memTotal = Math.round(mem.heapTotal / 1024 / 1024);
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `📱 *Device Info:*\n\n` +
      `🖥️ Platform: ${platform}\n` +
      `⚙️ Node.js: ${nodeVersion}\n` +
      `⏱️ System Uptime: ${uptime}\n` +
      `💾 Memory: ${memUsed}MB / ${memTotal}MB\n` +
      `🤖 Bot: NUTTER-XMD`,
  });
}

export async function repoCommand(ctx: CommandContext) {
  await ctx.sock.sendMessage(ctx.jid, {
    text:
      `📦 *NUTTER-XMD Repository*\n\n` +
      `🤖 Bot: NUTTER-XMD\n` +
      `👑 Owner: NUTTER-DEV\n` +
      `⚡ Version: 2.0\n` +
      `🌐 Platform: WhatsApp\n\n` +
      `_A multi-feature WhatsApp bot powered by Baileys_`,
  });
}

export async function calculateCommand(ctx: CommandContext) {
  const expr = ctx.argText;
  if (!expr) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}calculate <expression>\nExample: ${ctx.prefix}calculate 2 + 2 * 5` });
  try {
    const { evaluate } = await import("mathjs");
    const result = evaluate(expr);
    await ctx.sock.sendMessage(ctx.jid, { text: `🧮 *Calculator:*\n\n📥 Input: \`${expr}\`\n📤 Result: *${result}*` });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Invalid expression: ${e.message}` });
  }
}

export async function fancyCommand(ctx: CommandContext) {
  const text = ctx.argText;
  if (!text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}fancy <text>` });
  const fancy = text.split("").map((c) => FANCY_MAP[c] ?? c).join("");
  await ctx.sock.sendMessage(ctx.jid, { text: `✨ *Fancy Text:*\n\n${fancy}` });
}

export async function fliptextCommand(ctx: CommandContext) {
  const text = ctx.argText;
  if (!text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}fliptext <text>` });
  const flipped = text.split("").map((c) => FLIP_MAP[c] ?? c).reverse().join("");
  await ctx.sock.sendMessage(ctx.jid, { text: `🔄 *Flipped Text:*\n\n${flipped}` });
}

export async function genpassCommand(ctx: CommandContext) {
  const len = Math.min(Math.max(parseInt(ctx.args[0]) || 16, 6), 64);
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < len; i++) pass += charset[Math.floor(Math.random() * charset.length)];
  await ctx.sock.sendMessage(ctx.jid, { text: `🔐 *Generated Password (${len} chars):*\n\n\`${pass}\`\n\n_Keep this safe!_ 🔒` });
}

export async function qrcodeCommand(ctx: CommandContext) {
  const data = ctx.argText;
  if (!data) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}qrcode <text or URL>` });
  try {
    const qrBuffer = await QRCode.toBuffer(data, { width: 400, margin: 2 });
    await ctx.sock.sendMessage(ctx.jid, { image: qrBuffer, caption: `🔲 *QR Code for:* ${data}` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to generate QR code." });
  }
}

export async function tinyurlCommand(ctx: CommandContext) {
  const url = ctx.argText;
  if (!url || !url.startsWith("http")) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}tinyurl <URL>` });
  try {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 8000 });
    await ctx.sock.sendMessage(ctx.jid, { text: `🔗 *Shortened URL:*\n\n${res.data}` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to shorten URL." });
  }
}

export async function sayCommand(ctx: CommandContext) {
  const text = ctx.argText;
  if (!text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}say <message>` });
  await ctx.sock.sendMessage(ctx.jid, { text });
}

/** Resolve the target JID for .dp/.getpp:
 *  1. Phone number arg  →  e.g. .dp 254712345678
 *  2. Reply to message  →  the sender of the quoted message
 *  3. @mention          →  first mentioned JID
 *  4. Fallback          →  the person who sent the command
 */
function resolveProfileTarget(ctx: CommandContext): string {
  // 1️⃣ Phone number argument (digits only, optionally with + or spaces)
  const numArg = ctx.args[0]?.replace(/\D/g, "");
  if (numArg && numArg.length >= 7) {
    return `${numArg}@s.whatsapp.net`;
  }

  // 2️⃣ Reply to a message — grab the original sender
  const ci = getQuotedContext(ctx.msg);
  if (ci?.participant) return ci.participant;
  if (ci?.stanzaId) {
    // group message: remoteJid is the group, participant is the sender
    // dm reply: participant may be undefined, use remoteJid as sender
    const fromMe = ctx.msg.key.fromMe;
    return fromMe ? ctx.senderJid : (ci.remoteJid ?? ctx.senderJid);
  }

  // 3️⃣ @mention
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return mentioned;

  // 4️⃣ Fallback → own profile
  return ctx.senderJid;
}

export async function getppCommand(ctx: CommandContext) {
  return dpCommand(ctx);
}

export async function dpCommand(ctx: CommandContext) {
  const target = resolveProfileTarget(ctx);
  const displayNum = target.split("@")[0];

  try {
    const url = await ctx.sock.profilePictureUrl(target, "image");
    if (!url) {
      await ctx.sock.sendMessage(ctx.jid, {
        text: `❌ No profile picture found for *+${displayNum}* — it may be hidden or the number is not on WhatsApp.`,
      });
      return;
    }
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    const buffer = Buffer.from(res.data);
    await ctx.sock.sendMessage(ctx.jid, {
      image: buffer,
      caption: `👤 *Profile Picture*\n📞 +${displayNum}`,
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, {
      text: `❌ Could not fetch profile picture for *+${displayNum}*. The user may have hidden it.`,
    });
  }
}

export async function stickerCommand(ctx: CommandContext) {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.imageMessage && !quoted?.videoMessage) {
    return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an image or video with ${ctx.prefix}sticker to convert it to a sticker.` });
  }
  try {
    const media = await downloadMediaMessage(
      { key: ctx.msg.key, message: quoted.imageMessage ? { imageMessage: quoted.imageMessage } : { videoMessage: quoted.videoMessage } } as any,
      "buffer",
      {}
    );
    await ctx.sock.sendMessage(ctx.jid, { sticker: media as Buffer });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to create sticker." });
  }
}

// Extract contextInfo from any message type (text reply, image reply, etc.)
function getQuotedContext(msg: import("@whiskeysockets/baileys").WAMessage) {
  const m = msg.message;
  return (
    m?.extendedTextMessage?.contextInfo ??
    m?.imageMessage?.contextInfo ??
    m?.videoMessage?.contextInfo ??
    m?.audioMessage?.contextInfo ??
    m?.documentMessage?.contextInfo ??
    m?.stickerMessage?.contextInfo ??
    null
  );
}

// Unwrap view-once wrapper and return { inner, image, video, audio }
function unwrapViewOnce(quoted: Record<string, any> | null | undefined) {
  if (!quoted) return null;
  const inner: Record<string, any> | null | undefined =
    quoted.viewOnceMessage?.message ??
    quoted.viewOnceMessageV2?.message ??
    quoted.viewOnceMessageV2Extension?.message;
  if (!inner) return null;
  return {
    inner,
    image: inner.imageMessage ?? null,
    video: inner.videoMessage ?? null,
    audio: inner.audioMessage ?? null,
  };
}

export async function vvCommand(ctx: CommandContext) {
  const ci = getQuotedContext(ctx.msg);
  const vv = unwrapViewOnce(ci?.quotedMessage as any);

  if (!vv || (!vv.image && !vv.video && !vv.audio)) {
    return ctx.sock.sendMessage(ctx.jid, {
      text: `❓ Reply to a view-once photo, video or audio with *${ctx.prefix}vv* to reveal it.`,
    });
  }

  try {
    // Use the original message key so Baileys fetches from the right node
    const fakeMsg = {
      key: {
        remoteJid: ctx.jid,
        fromMe: false,
        id: ci!.stanzaId!,
        participant: ci!.participant,
      },
      message: vv.image
        ? { imageMessage: vv.image }
        : vv.video
        ? { videoMessage: vv.video }
        : { audioMessage: vv.audio },
    };

    const media = await downloadMediaMessage(fakeMsg as any, "buffer", {});

    if (vv.image) {
      await ctx.sock.sendMessage(ctx.jid, {
        image: media as Buffer,
        caption: `👁️ *View-Once Revealed*\n\n_By *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_`,
      });
    } else if (vv.video) {
      await ctx.sock.sendMessage(ctx.jid, {
        video: media as Buffer,
        caption: `👁️ *View-Once Revealed*\n\n_By *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_`,
      });
    } else {
      await ctx.sock.sendMessage(ctx.jid, {
        audio: media as Buffer,
        mimetype: (vv.audio?.mimetype as string) || "audio/ogg; codecs=opus",
        ptt: (vv.audio?.ptt as boolean) ?? true,
      });
    }
  } catch (e) {
    console.error("[vv]", e);
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to reveal view-once. The media may have expired." });
  }
}

export async function vv2Command(ctx: CommandContext) {
  const ci = getQuotedContext(ctx.msg);
  const vv = unwrapViewOnce(ci?.quotedMessage as any);

  if (!vv || (!vv.image && !vv.video && !vv.audio)) {
    return ctx.sock.sendMessage(ctx.jid, {
      text: `❓ Reply to a view-once message with *${ctx.prefix}vv2* to forward it privately to the owner.`,
    });
  }

  try {
    const fakeMsg = {
      key: {
        remoteJid: ctx.jid,
        fromMe: false,
        id: ci!.stanzaId!,
        participant: ci!.participant,
      },
      message: vv.image
        ? { imageMessage: vv.image }
        : vv.video
        ? { videoMessage: vv.video }
        : { audioMessage: vv.audio },
    };

    const media = await downloadMediaMessage(fakeMsg as any, "buffer", {});
    const ownerJid = ctx.botJid.split(":")[0] + "@s.whatsapp.net";
    const tag = `👁️ *View-Once (VV2)*\n\n📍 From: @${ctx.senderJid.split("@")[0]}\n💬 Chat: ${ctx.jid}\n\n_By *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_`;

    if (vv.image) {
      await ctx.sock.sendMessage(ownerJid, { image: media as Buffer, caption: tag, mentions: [ctx.senderJid] });
    } else if (vv.video) {
      await ctx.sock.sendMessage(ownerJid, { video: media as Buffer, caption: tag, mentions: [ctx.senderJid] });
    } else {
      await ctx.sock.sendMessage(ownerJid, {
        audio: media as Buffer,
        mimetype: (vv.audio?.mimetype as string) || "audio/ogg; codecs=opus",
        ptt: (vv.audio?.ptt as boolean) ?? true,
      });
    }
    await ctx.sock.sendMessage(ctx.jid, { text: "✅ View-once forwarded to owner DM." });
  } catch (e) {
    console.error("[vv2]", e);
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to retrieve view-once message." });
  }
}

export async function testCommand(ctx: CommandContext) {
  const uptime = formatDuration(Date.now() - startTime);
  const mem = process.memoryUsage();
  const memUsed = Math.round(mem.heapUsed / 1024 / 1024);

  const caption =
    `🟢 *Status:* Online & Active\n` +
    `⏱️ *Uptime:* ${uptime}\n` +
    `💾 *Memory:* ${memUsed}MB\n` +
    `📡 *Server:* Running\n` +
    `🔋 *Health:* Excellent\n\n` +
    `*𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* is alive and ready! ⚡`;

  const banner = loadBanner();
  if (banner) {
    await ctx.sock.sendMessage(ctx.jid, { image: banner, caption });
  } else {
    await ctx.sock.sendMessage(ctx.jid, { text: caption });
  }
}

export async function aliveCommand(ctx: CommandContext) {
  return testCommand(ctx);
}

export async function pairCommand(ctx: CommandContext) {
  await ctx.sock.sendMessage(ctx.jid, { text: "🔗 To pair a new device, use the bot dashboard and enter your phone number in the Status tab." });
}

export async function emojimixCommand(ctx: CommandContext) {
  const [e1, e2] = ctx.args;
  if (!e1 || !e2) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}emojimix 😀 🔥` });
  await ctx.sock.sendMessage(ctx.jid, { text: `🎨 Emoji mix of ${e1} + ${e2} = ${e1}${e2}\n\n_Note: True emoji mixing requires a device with Google Emoji Kitchen support_` });
}
