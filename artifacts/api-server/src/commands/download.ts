import axios from "axios";
import ytdl from "@distube/ytdl-core";
import type { CommandContext } from "./context";

async function downloadYouTube(url: string, audioOnly: boolean): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const format = audioOnly ? "lowestaudio" : "lowestvideo";
    const stream = ytdl(url, { quality: format, filter: audioOnly ? "audioonly" : undefined });
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    setTimeout(() => reject(new Error("Timeout")), 90000);
  });
}

export async function youtubeCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url || !url.includes("youtu")) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}youtube <YouTube URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Downloading YouTube video...* (please wait)" });
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const duration = parseInt(info.videoDetails.lengthSeconds);
    if (duration > 600) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Video is too long (max 10 minutes)." });
    const buffer = await downloadYouTube(url, false);
    await ctx.sock.sendMessage(ctx.jid, {
      video: buffer,
      caption: `🎬 *${title}*\n_Downloaded by NUTTER-XMD_`,
      mimetype: "video/mp4",
    });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download: ${e.message}` });
  }
}

export async function songCommand(ctx: CommandContext) {
  const query = ctx.argText;
  if (!query) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}song <YouTube URL or title>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🎵 *Downloading audio...* (please wait)" });
  try {
    let url = query;
    if (!query.includes("youtu")) {
      // Search for the song
      const res = await axios.get(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " audio")}`,
        { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const match = (res.data as string).match(/\"videoId\":\"([^\"]{11})\"/);
      if (!match) return ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not find "${query}" on YouTube.` });
      url = `https://youtu.be/${match[1]}`;
    }
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const duration = parseInt(info.videoDetails.lengthSeconds);
    if (duration > 600) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Song is too long (max 10 minutes)." });
    const buffer = await downloadYouTube(url, true);
    await ctx.sock.sendMessage(ctx.jid, {
      audio: buffer,
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      pttAudio: false,
    } as any);
    await ctx.sock.sendMessage(ctx.jid, { text: `🎵 *${title}*\n_Downloaded by NUTTER-XMD_` });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download: ${e.message}` });
  }
}

export async function tiktokCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}tiktok <TikTok URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Downloading TikTok video...*" });
  try {
    const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    const data = res.data;
    if (!data.data?.play) throw new Error("No video URL found");
    const videoRes = await axios.get(data.data.play, { responseType: "arraybuffer", timeout: 30000 });
    const buffer = Buffer.from(videoRes.data);
    await ctx.sock.sendMessage(ctx.jid, {
      video: buffer,
      caption: `🎵 *${data.data.title || "TikTok Video"}*\n👤 @${data.data.author?.unique_id || "unknown"}\n_Downloaded by NUTTER-XMD_`,
      mimetype: "video/mp4",
    });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download TikTok: ${e.message}` });
  }
}

export async function instagramCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}instagram <Instagram URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Fetching Instagram media...*" });
  try {
    const res = await axios.get(`https://saveig.app/api?url=${encodeURIComponent(url)}`, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const items = res.data?.data?.medias;
    if (!items?.length) throw new Error("No media found");
    const mediaUrl = items[0].url;
    const mediaRes = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 30000 });
    const buffer = Buffer.from(mediaRes.data);
    const isVideo = mediaUrl.includes(".mp4") || items[0].type === "video";
    await ctx.sock.sendMessage(ctx.jid, isVideo
      ? { video: buffer, caption: "📸 *Instagram Video*\n_Downloaded by NUTTER-XMD_", mimetype: "video/mp4" }
      : { image: buffer, caption: "📸 *Instagram Photo*\n_Downloaded by NUTTER-XMD_" }
    );
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download: ${e.message}\n\nTip: Make sure the post is public.` });
  }
}

export async function facebookCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}facebook <Facebook video URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Fetching Facebook video...*" });
  try {
    const res = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    if (!res.data?.data?.play) throw new Error("No video found");
    const videoRes = await axios.get(res.data.data.play, { responseType: "arraybuffer", timeout: 30000 });
    await ctx.sock.sendMessage(ctx.jid, {
      video: Buffer.from(videoRes.data),
      caption: "📘 *Facebook Video*\n_Downloaded by NUTTER-XMD_",
      mimetype: "video/mp4",
    });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download Facebook video: ${e.message}` });
  }
}

export async function twitterCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}twitter <Twitter/X video URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Fetching Twitter/X media...*" });
  try {
    const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(url)}`, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const match = (res.data as string).match(/https:\/\/video\.twimg\.com[^"'\s]+\.mp4[^"'\s]*/);
    if (!match) throw new Error("No video found");
    const videoRes = await axios.get(match[0], { responseType: "arraybuffer", timeout: 30000 });
    await ctx.sock.sendMessage(ctx.jid, {
      video: Buffer.from(videoRes.data),
      caption: "🐦 *Twitter/X Video*\n_Downloaded by NUTTER-XMD_",
      mimetype: "video/mp4",
    });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to download Twitter video: ${e.message}` });
  }
}

export async function mediafireCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url || !url.includes("mediafire")) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}mediafire <MediaFire URL>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⬇️ *Fetching MediaFire link...*" });
  try {
    const res = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
    const match = (res.data as string).match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
    if (!match) throw new Error("Direct link not found");
    await ctx.sock.sendMessage(ctx.jid, { text: `📦 *MediaFire Download Link:*\n\n${match[1]}` });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Failed to get MediaFire link: ${e.message}` });
  }
}

export async function gdriveCommand(ctx: CommandContext) {
  const url = ctx.args[0];
  if (!url || !url.includes("drive.google")) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}gdrive <Google Drive URL>` });
  const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return ctx.sock.sendMessage(ctx.jid, { text: "❌ Could not extract file ID from URL." });
  const directLink = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  await ctx.sock.sendMessage(ctx.jid, { text: `📁 *Google Drive Direct Download:*\n\n${directLink}` });
}

export async function imageCommand(ctx: CommandContext) {
  const query = ctx.argText;
  if (!query) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}image <search term>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🖼️ *Searching for image...*" });
  try {
    const res = await axios.get(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
      { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    const matches = (res.data as string).match(/https:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi);
    const filtered = (matches ?? []).filter((u) => !u.includes("google") && !u.includes("gstatic")).slice(0, 1);
    if (!filtered.length) throw new Error("No images found");
    const imgRes = await axios.get(filtered[0], { responseType: "arraybuffer", timeout: 15000 });
    await ctx.sock.sendMessage(ctx.jid, { image: Buffer.from(imgRes.data), caption: `🔍 *${query}*` });
  } catch (e: any) {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not find an image for "${query}". Try a different search term.` });
  }
}
