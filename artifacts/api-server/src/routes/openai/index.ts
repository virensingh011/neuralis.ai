import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, conversations, messages, flashcardsTable, studySessionsTable, healthcareConversationsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import {
  CreateOpenaiConversationBody,
  UpdateOpenaiConversationBody,
  GetOpenaiConversationParams,
  UpdateOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageBody,
  SendOpenaiMessageParams,
  GenerateOpenaiImageBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const convos = await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  res.json(convos);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [convo] = await db.insert(conversations).values({
    title: parsed.data.title,
    mode: parsed.data.mode ?? "general",
  }).returning();
  res.status(201).json(convo);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [convo] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json({ ...convo, messages: msgs });
});

router.patch("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = UpdateOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [convo] = await db.update(conversations).set({ title: parsed.data.title, updatedAt: new Date() }).where(eq(conversations.id, params.data.id)).returning();
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(convo);
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [convo] = await db.delete(conversations).where(eq(conversations.id, params.data.id)).returning();
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [convo] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: params.data.id, role: "user", content: parsed.data.content });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, params.data.id));

  const history = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);

  const systemPrompt = convo.mode === "code"
    ? "You are Neuralis AI, an expert coding assistant created by Viren Singh. Provide clean, well-commented code with detailed explanations. You excel at debugging, architecture, and all programming languages."
    : convo.mode === "research"
    ? "You are Neuralis AI, an expert research assistant created by Viren Singh. Provide thorough, academically rigorous responses with citations when possible. Think critically and analytically like a Harvard or MIT researcher."
    : "You are Neuralis AI, a highly intelligent AI assistant created by Viren Singh. You combine the analytical depth of MIT with the humanistic insight of Harvard. Be helpful, thoughtful, and intellectually engaging. Never be restrictive — answer questions openly and intelligently.";

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: params.data.id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, "Error streaming AI response");
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
  }
  res.end();
});

router.post("/openai/generate-image", async (req, res): Promise<void> => {
  const parsed = GenerateOpenaiImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const size = (parsed.data.size as "1024x1024" | "1536x1024" | "1024x1536") ?? "1024x1024";
    const buffer = await generateImageBuffer(parsed.data.prompt, size);
    res.json({ b64_json: buffer.toString("base64"), prompt: parsed.data.prompt });
  } catch (err) {
    logger.error({ err }, "Error generating image");
    res.status(500).json({ error: "Image generation failed" });
  }
});

router.get("/openai/stats", async (_req, res): Promise<void> => {
  const [convoCount] = await db.select({ count: count() }).from(conversations);
  const [msgCount] = await db.select({ count: count() }).from(messages);
  const [flashCount] = await db.select({ count: count() }).from(flashcardsTable);
  const [sessionCount] = await db.select({ count: count() }).from(studySessionsTable);
  const [healthCount] = await db.select({ count: count() }).from(healthcareConversationsTable);

  res.json({
    totalConversations: Number(convoCount?.count ?? 0),
    totalMessages: Number(msgCount?.count ?? 0),
    imagesGenerated: 0,
    studySessions: Number(sessionCount?.count ?? 0),
    healthConsultations: Number(healthCount?.count ?? 0),
  });
});

export default router;
