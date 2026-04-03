import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botsTable = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull().default("My Bot"),
  status: text("status").notNull().default("offline"),
  isActive: boolean("is_active").notNull().default(true),
  phoneNumber: text("phone_number"),
  sessionData: text("session_data"),
  prefix: text("prefix").notNull().default("!"),
  mode: text("mode").notNull().default("public"),
  // WhatsApp feature toggles
  autoReply: boolean("auto_reply").notNull().default(false),
  autoReplyMessage: text("auto_reply_message"),
  antiCall: boolean("anti_call").notNull().default(false),
  antiLink: boolean("anti_link").notNull().default(false),
  antiSpam: boolean("anti_spam").notNull().default(false),
  welcomeMessage: boolean("welcome_message").notNull().default(false),
  goodbyeMessage: boolean("goodbye_message").notNull().default(false),
  autoRead: boolean("auto_read").notNull().default(false),
  typingStatus: boolean("typing_status").notNull().default(false),
  alwaysOnline: boolean("always_online").notNull().default(false),
  autoStatus: boolean("auto_status").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBotSchema = createInsertSchema(botsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBot = z.infer<typeof insertBotSchema>;
export type Bot = typeof botsTable.$inferSelect;
