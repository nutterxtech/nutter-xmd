import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    remoteJid: text("remote_jid").notNull(),
    messageId: text("message_id").notNull(),
    text: text("text"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_expires_at_idx").on(t.expiresAt),
    index("messages_user_jid_idx").on(t.userId, t.remoteJid),
  ]
);

export type Message = typeof messagesTable.$inferSelect;
