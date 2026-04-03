import axios from "axios";
import type { CommandContext } from "./context";

export async function weatherCommand(ctx: CommandContext) {
  const city = ctx.argText;
  if (!city) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}weather <city>` });
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 });
    await ctx.sock.sendMessage(ctx.jid, { text: `🌤️ *Weather for ${city}:*\n\n${res.data}` });
  } catch {
    try {
      const res2 = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=%l:+%C+%t+%h+%w`, { timeout: 8000 });
      await ctx.sock.sendMessage(ctx.jid, { text: `🌤️ *Weather for ${city}:*\n\n${res2.data}` });
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not find weather for "${city}".` });
    }
  }
}

export async function defineCommand(ctx: CommandContext) {
  const word = ctx.args[0];
  if (!word) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}define <word>` });
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10000 });
    const entry = res.data[0];
    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0];
    let text = `📖 *${entry.word}*\n`;
    if (entry.phonetic) text += `🔊 /${entry.phonetic}/\n`;
    text += `📝 _(${meaning?.partOfSpeech})_\n\n`;
    text += `${def?.definition}\n`;
    if (def?.example) text += `\n💬 _"${def.example}"_`;
    if (entry.meanings?.length > 1) {
      const m2 = entry.meanings[1];
      const d2 = m2.definitions?.[0];
      if (d2) text += `\n\n📝 _(${m2.partOfSpeech})_\n${d2.definition}`;
    }
    await ctx.sock.sendMessage(ctx.jid, { text });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ No definition found for "${word}".` });
  }
}

export async function imdbCommand(ctx: CommandContext) {
  const title = ctx.argText;
  if (!title) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}imdb <movie title>` });
  try {
    const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=trilogy`, { timeout: 10000 });
    const m = res.data;
    if (m.Response === "False") return ctx.sock.sendMessage(ctx.jid, { text: `❌ Movie "${title}" not found.` });
    const text =
      `🎬 *${m.Title}* (${m.Year})\n\n` +
      `⭐ *IMDb:* ${m.imdbRating}/10\n` +
      `🎭 *Genre:* ${m.Genre}\n` +
      `⏱️ *Runtime:* ${m.Runtime}\n` +
      `🌍 *Country:* ${m.Country}\n` +
      `🎥 *Director:* ${m.Director}\n` +
      `👥 *Cast:* ${m.Actors}\n\n` +
      `📖 *Plot:*\n${m.Plot}`;
    await ctx.sock.sendMessage(ctx.jid, { text });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not fetch info for "${title}".` });
  }
}

export async function lyricsCommand(ctx: CommandContext) {
  const parts = ctx.argText.split(" - ");
  if (parts.length < 2) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}lyrics <artist> - <song title>` });
  const [artist, title] = parts.map((s) => s.trim());
  await ctx.sock.sendMessage(ctx.jid, { text: `🎵 *Searching lyrics for "${title}" by ${artist}...*` });
  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 15000 });
    const lyrics = res.data.lyrics?.trim();
    if (!lyrics) throw new Error("empty");
    const chunks = lyrics.match(/.{1,4000}/gs) ?? [];
    await ctx.sock.sendMessage(ctx.jid, { text: `🎵 *${title}* — ${artist}\n\n${chunks[0]}` });
    for (let i = 1; i < chunks.length; i++) {
      await ctx.sock.sendMessage(ctx.jid, { text: chunks[i] });
    }
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Lyrics not found for "${title}" by ${artist}.` });
  }
}

export async function ytsCommand(ctx: CommandContext) {
  const query = ctx.argText;
  if (!query) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}yts <search query>` });
  try {
    const res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const matches = (res.data as string).match(/\"videoId\":\"([^\"]+)\"/g);
    const ids = [...new Set((matches ?? []).map((m) => m.replace(/"videoId":"/g, "").replace(/"/g, "")))].slice(0, 5);
    if (!ids.length) return ctx.sock.sendMessage(ctx.jid, { text: `❌ No results for "${query}".` });
    const results = ids.map((id, i) => `${i + 1}. https://youtu.be/${id}`).join("\n");
    await ctx.sock.sendMessage(ctx.jid, { text: `🎬 *YouTube Search: "${query}"*\n\n${results}` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not search YouTube for "${query}".` });
  }
}

export async function shazamCommand(ctx: CommandContext) {
  await ctx.sock.sendMessage(ctx.jid, { text: "🎵 *Shazam* feature coming soon! Reply to an audio message with this command." });
}
