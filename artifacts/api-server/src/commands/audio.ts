import { execFile } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import type { CommandContext } from "./context";

const execFileAsync = promisify(execFile);

async function downloadQuotedAudio(ctx: CommandContext): Promise<Buffer | null> {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.audioMessage && !quoted?.videoMessage) return null;
  try {
    const msg = quoted.audioMessage
      ? { audioMessage: quoted.audioMessage }
      : { videoMessage: quoted.videoMessage };
    const buf = await downloadMediaMessage(
      { key: ctx.msg.key, message: msg as any },
      "buffer",
      {}
    );
    return buf as Buffer;
  } catch {
    return null;
  }
}

async function ffmpegProcess(inputBuf: Buffer, inExt: string, outExt: string, args: string[]): Promise<Buffer> {
  const inFile = join(tmpdir(), `nxmd_in_${Date.now()}.${inExt}`);
  const outFile = join(tmpdir(), `nxmd_out_${Date.now()}.${outExt}`);
  writeFileSync(inFile, inputBuf);
  try {
    await execFileAsync("ffmpeg", ["-y", "-i", inFile, ...args, outFile], { timeout: 60000 });
    const result = readFileSync(outFile);
    return result;
  } finally {
    if (existsSync(inFile)) unlinkSync(inFile);
    if (existsSync(outFile)) unlinkSync(outFile);
  }
}

export async function bassCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}bass` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🔊 *Applying bass boost...*" });
  try {
    const result = await ffmpegProcess(audio, "ogg", "mp3", ["-af", "bass=g=20,equalizer=f=40:width_type=h:width=50:g=10"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to apply bass boost." });
  }
}

export async function earrapeCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}earrape` });
  await ctx.sock.sendMessage(ctx.jid, { text: "💥 *Applying earrape effect...*" });
  try {
    const result = await ffmpegProcess(audio, "ogg", "mp3", ["-af", "acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to apply earrape effect." });
  }
}

export async function reverseCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}reverse` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⏪ *Reversing audio...*" });
  try {
    const result = await ffmpegProcess(audio, "ogg", "mp3", ["-af", "areverse"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to reverse audio." });
  }
}

export async function robotCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}robot` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🤖 *Applying robot voice...*" });
  try {
    const result = await ffmpegProcess(audio, "ogg", "mp3", ["-af", "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to apply robot effect." });
  }
}

export async function deepCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}deep` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🎚️ *Applying deep voice effect...*" });
  try {
    const result = await ffmpegProcess(audio, "ogg", "mp3", ["-af", "asetrate=44100*0.7,aresample=44100,atempo=1.43"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to apply deep voice effect." });
  }
}

export async function tomp3Command(ctx: CommandContext) {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.videoMessage) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to a video message with ${ctx.prefix}tomp3` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🎵 *Converting to MP3...*" });
  try {
    const buf = await downloadMediaMessage(
      { key: ctx.msg.key, message: { videoMessage: quoted.videoMessage } as any },
      "buffer",
      {}
    ) as Buffer;
    const result = await ffmpegProcess(buf, "mp4", "mp3", ["-vn", "-acodec", "libmp3lame", "-q:a", "2"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/mpeg", fileName: "audio.mp3", pttAudio: false } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to convert to MP3." });
  }
}

export async function topttCommand(ctx: CommandContext) {
  const audio = await downloadQuotedAudio(ctx);
  if (!audio) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Reply to an audio message with ${ctx.prefix}toptt` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🎙️ *Converting to voice note...*" });
  try {
    const result = await ffmpegProcess(audio, "mp3", "ogg", ["-c:a", "libopus", "-b:a", "128k"]);
    await ctx.sock.sendMessage(ctx.jid, { audio: result, mimetype: "audio/ogg; codecs=opus", pttAudio: true } as any);
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Failed to convert to PTT." });
  }
}
