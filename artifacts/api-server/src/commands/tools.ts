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

export async function getppCommand(ctx: CommandContext) {
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.participant;
  const target = mentioned ?? quoted ?? ctx.senderJid;
  try {
    const url = await ctx.sock.profilePictureUrl(target, "image");
    if (!url) {
      await ctx.sock.sendMessage(ctx.jid, { text: "❌ No profile picture found or it's hidden." });
      return;
    }
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    const buffer = Buffer.from(res.data);
    await ctx.sock.sendMessage(ctx.jid, { image: buffer, caption: `👤 *Profile Picture*` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Could not fetch profile picture. The user may have hidden it." });
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

export async function vvCommand(ctx: CommandContext) {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const vvImage = quoted?.viewOnceMessage?.message?.imageMessage || quoted?.viewOnceMessageV2?.message?.imageMessage;
  const vvVideo = quoted?.viewOnceMessage?.message?.videoMessage || quoted?.viewOnceMessageV2?.message?.videoMessage;
  if (!vvImage && !vvVideo) {
    return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to a view-once message with ${ctx.prefix}vv to reveal it.` });
  }
  try {
    const innerMsg = vvImage
      ? { imageMessage: vvImage }
      : { videoMessage: vvVideo };
    const media = await downloadMediaMessage(
      { key: ctx.msg.key, message: innerMsg } as any,
      "buffer",
      {}
    );
    if (vvImage) {
      await ctx.sock.sendMessage(ctx.jid, { image: media as Buffer, caption: `👁️ *View-Once Revealed*\n\n_Retrieved by *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_` });
    } else {
      await ctx.sock.sendMessage(ctx.jid, { video: media as Buffer, caption: `👁️ *View-Once Revealed*\n\n_Retrieved by *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_` });
    }
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to reveal view-once message." });
  }
}

export async function vv2Command(ctx: CommandContext) {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const vvImage = quoted?.viewOnceMessage?.message?.imageMessage || quoted?.viewOnceMessageV2?.message?.imageMessage;
  const vvVideo = quoted?.viewOnceMessage?.message?.videoMessage || quoted?.viewOnceMessageV2?.message?.videoMessage;
  if (!vvImage && !vvVideo) {
    return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to a view-once message with ${ctx.prefix}vv2 to send it to owner DM.` });
  }
  try {
    const innerMsg = vvImage
      ? { imageMessage: vvImage }
      : { videoMessage: vvVideo };
    const media = await downloadMediaMessage(
      { key: ctx.msg.key, message: innerMsg } as any,
      "buffer",
      {}
    );
    // Send to owner DM
    const ownerJid = ctx.botJid.split(":")[0] + "@s.whatsapp.net";
    if (vvImage) {
      await ctx.sock.sendMessage(ownerJid, {
        image: media as Buffer,
        caption: `👁️ *View-Once (VV2)*\n\n📍 From: @${ctx.senderJid.split("@")[0]}\n💬 Chat: ${ctx.jid}\n\n_Retrieved by *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_`,
        mentions: [ctx.senderJid],
      });
    } else {
      await ctx.sock.sendMessage(ownerJid, {
        video: media as Buffer,
        caption: `👁️ *View-Once (VV2)*\n\n📍 From: @${ctx.senderJid.split("@")[0]}\n💬 Chat: ${ctx.jid}\n\n_Retrieved by *𝑵𝑼𝑻𝑻𝑬𝑹-𝑿𝑴𝑫* ⚡_`,
        mentions: [ctx.senderJid],
      });
    }
    await ctx.sock.sendMessage(ctx.jid, { text: "✅ View-once sent to owner DM." });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to retrieve view-once message." });
  }
}

export async function testCommand(ctx: CommandContext) {
  const uptime = formatDuration(Date.now() - startTime);
  const mem = process.memoryUsage();
  const memUsed = Math.round(mem.heapUsed / 1024 / 1024);
  const ping = Date.now();

  const caption =
    `╔══[ 🤖 *NUTTER-XMD STATUS* ]══╗\n\n` +
    `🟢 *Status:* Online & Active\n` +
    `⏱️ *Uptime:* ${uptime}\n` +
    `💾 *Memory:* ${memUsed}MB\n` +
    `📡 *Server:* Running\n` +
    `🔋 *Health:* Excellent\n\n` +
    `╚══════════════════╝\n\n` +
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
