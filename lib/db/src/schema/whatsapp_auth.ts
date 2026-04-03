import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const whatsappAuthTable = pgTable("whatsapp_auth", {
  userId: text("user_id").primaryKey(),
  creds: text("creds"),
  keys: text("keys"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WhatsappAuth = typeof whatsappAuthTable.$inferSelect;
