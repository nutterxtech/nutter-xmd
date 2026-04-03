import axios from "axios";
import type { CommandContext } from "./context";

const TRUTHS = [
  "What's the most embarrassing thing that happened to you in school?",
  "Have you ever lied to your best friend? What was it about?",
  "What is your biggest fear?",
  "Have you ever cheated on a test?",
  "What's your most embarrassing moment?",
  "Who is your secret crush?",
  "What's the worst thing you've ever done?",
  "Have you ever stolen something?",
  "What's the biggest lie you've ever told?",
  "What is your strangest habit?",
  "Have you ever pretended to be sick to skip school or work?",
  "What's something you've done that you'd never want your parents to know?",
  "Have you ever had a crush on a friend's partner?",
  "What's your most unpopular opinion?",
  "What's the most childish thing you still do?",
];

const DARES = [
  "Send a voice note singing your favourite song.",
  "Change your profile picture to whatever the group decides for 1 hour.",
  "Send a selfie with a funny face right now.",
  "Text the 5th contact in your phone 'I miss you'.",
  "Do 20 push-ups and record yourself.",
  "Post an embarrassing throwback photo.",
  "Text your crush 'hey' right now.",
  "Let the group change your status for 30 minutes.",
  "Speak in a different accent for the next 5 messages.",
  "Send your most recent screenshot to the group.",
  "Call someone random from your contacts and sing happy birthday.",
  "Write a love poem for the person who last texted you.",
  "Send a message to your mom saying 'I lost my phone'.",
  "Do the worm dance and send a video.",
  "Eat a spoonful of hot sauce (record it).",
];

export async function factCommand(ctx: CommandContext) {
  try {
    const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", { timeout: 8000 });
    const fact = res.data.text;
    await ctx.sock.sendMessage(ctx.jid, { text: `🤓 *Random Fact:*\n\n_${fact}_` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "🤓 *Fact:* Did you know that honey never spoils? Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible!" });
  }
}

export async function jokesCommand(ctx: CommandContext) {
  try {
    const res = await axios.get("https://official-joke-api.appspot.com/jokes/random", { timeout: 8000 });
    const { setup, punchline } = res.data;
    await ctx.sock.sendMessage(ctx.jid, { text: `😂 *Joke Time!*\n\n${setup}\n\n_${punchline}_ 😂` });
  } catch {
    try {
      const res = await axios.get("https://v2.jokeapi.dev/joke/Any?safe-mode", { timeout: 8000 });
      const j = res.data;
      const text = j.type === "twopart" ? `${j.setup}\n\n_${j.delivery}_` : j.joke;
      await ctx.sock.sendMessage(ctx.jid, { text: `😂 *Joke Time!*\n\n${text} 😂` });
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: "😂 *Joke:* Why don't scientists trust atoms? Because they make up everything! 😂" });
    }
  }
}

export async function quotesCommand(ctx: CommandContext) {
  try {
    const res = await axios.get("https://zenquotes.io/api/random", { timeout: 8000 });
    const { q, a } = res.data[0];
    await ctx.sock.sendMessage(ctx.jid, { text: `💭 *Quote of the Moment:*\n\n_"${q}"_\n\n— *${a}*` });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: `💭 *Quote:*\n\n_"The only way to do great work is to love what you do."_\n\n— *Steve Jobs*` });
  }
}

export async function triviaCommand(ctx: CommandContext) {
  try {
    const res = await axios.get("https://opentdb.com/api.php?amount=1&type=multiple", { timeout: 8000 });
    const q = res.data.results[0];
    const allAnswers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
    const letters = ["A", "B", "C", "D"];
    const answerList = allAnswers.map((a: string, i: number) => `${letters[i]}. ${a.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&")}`).join("\n");
    const question = q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
    const correct = q.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
    await ctx.sock.sendMessage(ctx.jid, {
      text: `🎯 *Trivia Time!*\n\n*Category:* ${q.category}\n*Difficulty:* ${q.difficulty}\n\n❓ ${question}\n\n${answerList}\n\n||✅ Answer: ${correct}||`,
    });
  } catch {
    await ctx.sock.sendMessage(ctx.jid, { text: "🎯 *Trivia:*\n\nWhat is the capital of Australia?\n\nA. Sydney\nB. Melbourne\nC. Canberra\nD. Brisbane\n\n||✅ Answer: Canberra||" });
  }
}

export async function truthCommand(ctx: CommandContext) {
  const truth = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
  await ctx.sock.sendMessage(ctx.jid, { text: `🫣 *TRUTH:*\n\n_${truth}_` });
}

export async function dareCommand(ctx: CommandContext) {
  const dare = DARES[Math.floor(Math.random() * DARES.length)];
  await ctx.sock.sendMessage(ctx.jid, { text: `😈 *DARE:*\n\n_${dare}_` });
}

export async function truthOrDareCommand(ctx: CommandContext) {
  const isTruth = Math.random() > 0.5;
  if (isTruth) {
    const truth = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    await ctx.sock.sendMessage(ctx.jid, { text: `🎲 *TRUTH OR DARE?* You got... *TRUTH!*\n\n🫣 _${truth}_` });
  } else {
    const dare = DARES[Math.floor(Math.random() * DARES.length)];
    await ctx.sock.sendMessage(ctx.jid, { text: `🎲 *TRUTH OR DARE?* You got... *DARE!*\n\n😈 _${dare}_` });
  }
}
