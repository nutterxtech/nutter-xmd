import type { WASocket, WAMessage } from "@whiskeysockets/baileys";

export interface CommandContext {
  sock: WASocket;
  userId: string;
  jid: string;
  msg: WAMessage;
  args: string[];
  argText: string;
  prefix: string;
  isGroup: boolean;
  senderJid: string;
  pushName: string;
  isOwner: boolean;
  botJid: string;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;
