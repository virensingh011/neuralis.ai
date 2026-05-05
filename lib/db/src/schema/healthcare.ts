import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthcareConversationsTable = pgTable("healthcare_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  specialty: text("specialty").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthcareMessagesTable = pgTable("healthcare_messages", {
  id: serial("id").primaryKey(),
  conversationId: serial("conversation_id").notNull().references(() => healthcareConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHealthcareConversationSchema = createInsertSchema(healthcareConversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthcareMessageSchema = createInsertSchema(healthcareMessagesTable).omit({ id: true, createdAt: true });

export type InsertHealthcareConversation = z.infer<typeof insertHealthcareConversationSchema>;
export type HealthcareConversation = typeof healthcareConversationsTable.$inferSelect;
export type InsertHealthcareMessage = z.infer<typeof insertHealthcareMessageSchema>;
export type HealthcareMessage = typeof healthcareMessagesTable.$inferSelect;
