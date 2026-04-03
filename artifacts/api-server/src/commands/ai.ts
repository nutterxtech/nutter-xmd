import OpenAI from "openai";
import type { CommandContext } from "./context";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
});

async function askAI(prompt: string, system?: string): Promise<string> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user" as const, content: prompt },
      ],
      max_completion_tokens: 1024,
    });
    return res.choices[0]?.message?.content?.trim() ?? "❌ No response from AI.";
  } catch (e: any) {
    return `❌ AI error: ${e.message ?? "Unknown error"}`;
  }
}

function getReplyText(ctx: CommandContext): string {
  const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  return (
    quoted?.conversation ||
    quoted?.extendedTextMessage?.text ||
    ctx.argText ||
    ""
  );
}

export async function gptCommand(ctx: CommandContext) {
  const q = ctx.argText;
  if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}gpt <your question>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🤖 *GPT is thinking...*" });
  const answer = await askAI(q, "You are a helpful AI assistant named NUTTER-GPT. Be concise and helpful.");
  await ctx.sock.sendMessage(ctx.jid, { text: `🧠 *GPT Response:*\n\n${answer}` });
}

export async function geminiCommand(ctx: CommandContext) {
  const q = ctx.argText;
  if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}gemini <your question>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "✨ *Gemini is thinking...*" });
  const answer = await askAI(q, "You are Gemini, Google's AI assistant. Be helpful, accurate, and conversational.");
  await ctx.sock.sendMessage(ctx.jid, { text: `✨ *Gemini Response:*\n\n${answer}` });
}

export async function blackboxCommand(ctx: CommandContext) {
  const q = ctx.argText;
  if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}blackbox <code question>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "⚫ *Blackbox AI coding...*" });
  const answer = await askAI(q, "You are Blackbox AI, specialized in coding and programming. Provide accurate code solutions and explanations.");
  await ctx.sock.sendMessage(ctx.jid, { text: `⚫ *Blackbox Response:*\n\n${answer}` });
}

export async function deepseekCommand(ctx: CommandContext) {
  const q = ctx.argText;
  if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}deepseek <query>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🔬 *DeepSeek analyzing...*" });
  const answer = await askAI(q, "You are DeepSeek AI. Provide deep, thorough analysis and explanations.");
  await ctx.sock.sendMessage(ctx.jid, { text: `🔬 *DeepSeek Response:*\n\n${answer}` });
}

export async function codeCommand(ctx: CommandContext) {
  const q = ctx.argText;
  if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}code <code request>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "💻 *Generating code...*" });
  const answer = await askAI(q, "You are a senior software engineer. Generate clean, efficient, well-commented code. Format code with proper syntax.");
  await ctx.sock.sendMessage(ctx.jid, { text: `💻 *Code Output:*\n\n${answer}` });
}

export async function analyzeCommand(ctx: CommandContext) {
  const text = getReplyText(ctx);
  if (!text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}analyze <text> or reply to a message` });
  await ctx.sock.sendMessage(ctx.jid, { text: "🔍 *Analyzing...*" });
  const answer = await askAI(`Analyze this thoroughly:\n\n${text}`, "You are an expert analyst. Provide detailed, structured analysis.");
  await ctx.sock.sendMessage(ctx.jid, { text: `🔍 *Analysis:*\n\n${answer}` });
}

export async function summarizeCommand(ctx: CommandContext) {
  const text = getReplyText(ctx);
  if (!text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}summarize <text> or reply to a message` });
  await ctx.sock.sendMessage(ctx.jid, { text: "📝 *Summarizing...*" });
  const answer = await askAI(`Summarize this concisely:\n\n${text}`, "Summarize text in 3-5 bullet points. Be concise and clear.");
  await ctx.sock.sendMessage(ctx.jid, { text: `📝 *Summary:*\n\n${answer}` });
}

export async function translateCommand(ctx: CommandContext) {
  const parts = ctx.argText.split(" ");
  const lang = parts[0];
  const text = parts.slice(1).join(" ") || getReplyText(ctx);
  if (!lang || !text) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}translate <language> <text>` });
  await ctx.sock.sendMessage(ctx.jid, { text: `🌍 *Translating to ${lang}...*` });
  const answer = await askAI(`Translate to ${lang}:\n\n${text}`, `Translate the given text to ${lang}. Output only the translation, nothing else.`);
  await ctx.sock.sendMessage(ctx.jid, { text: `🌍 *Translation (${lang}):*\n\n${answer}` });
}

export async function recipeCommand(ctx: CommandContext) {
  const dish = ctx.argText;
  if (!dish) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}recipe <dish name>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "👨‍🍳 *Finding recipe...*" });
  const answer = await askAI(`Give me a detailed recipe for: ${dish}`, "You are a professional chef. Provide ingredients and step-by-step cooking instructions.");
  await ctx.sock.sendMessage(ctx.jid, { text: `🍽️ *Recipe for ${dish}:*\n\n${answer}` });
}

export async function storyCommand(ctx: CommandContext) {
  const topic = ctx.argText;
  if (!topic) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}story <topic>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "📖 *Writing story...*" });
  const answer = await askAI(`Write a short, engaging story about: ${topic}`, "Write a creative, entertaining short story (200-300 words).");
  await ctx.sock.sendMessage(ctx.jid, { text: `📖 *Story:*\n\n${answer}` });
}

export async function teachCommand(ctx: CommandContext) {
  const topic = ctx.argText;
  if (!topic) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}teach <topic>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "📚 *Preparing lesson...*" });
  const answer = await askAI(`Teach me about: ${topic}`, "You are a great teacher. Explain the topic simply, with examples. Include key points and a fun fact.");
  await ctx.sock.sendMessage(ctx.jid, { text: `📚 *Lesson on ${topic}:*\n\n${answer}` });
}

export async function generateCommand(ctx: CommandContext) {
  const prompt = ctx.argText;
  if (!prompt) return ctx.sock.sendMessage(ctx.jid, { text: `❓ Usage: ${ctx.prefix}generate <prompt>` });
  await ctx.sock.sendMessage(ctx.jid, { text: "✨ *Generating...*" });
  const answer = await askAI(prompt, "You are a creative AI. Generate engaging, high-quality content based on the prompt.");
  await ctx.sock.sendMessage(ctx.jid, { text: `✨ *Generated:*\n\n${answer}` });
}
