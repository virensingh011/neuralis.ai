import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, healthcareConversationsTable, healthcareMessagesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateHealthcareConversationBody,
  GetHealthcareConversationParams,
  DeleteHealthcareConversationParams,
  SendHealthcareMessageBody,
  SendHealthcareMessageParams,
  AnalyzeSymptomsBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const HEALTHCARE_SYSTEM_PROMPT = `You are Neuralis Health AI, an advanced medical information assistant created by Viren Singh. You provide:

1. Clear, accurate medical information based on established medical knowledge
2. Evidence-based health guidance
3. Understandable explanations of medical conditions, symptoms, and treatments
4. Preventive health recommendations

IMPORTANT DISCLAIMER: Always remind users that you provide information only, not medical diagnosis or treatment. Encourage consulting qualified healthcare professionals for personal medical decisions. Never discourage seeking emergency care.

Your personality: Warm, empathetic, thorough, and scientifically grounded. Like a knowledgeable friend who happens to have medical expertise.`;

router.get("/healthcare/conversations", async (_req, res): Promise<void> => {
  const convos = await db.select().from(healthcareConversationsTable).orderBy(desc(healthcareConversationsTable.updatedAt));
  res.json(convos);
});

router.post("/healthcare/conversations", async (req, res): Promise<void> => {
  const parsed = CreateHealthcareConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [convo] = await db.insert(healthcareConversationsTable).values({
    title: parsed.data.title,
    specialty: parsed.data.specialty ?? "general",
  }).returning();
  res.status(201).json(convo);
});

router.get("/healthcare/conversations/:id", async (req, res): Promise<void> => {
  const params = GetHealthcareConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [convo] = await db.select().from(healthcareConversationsTable).where(eq(healthcareConversationsTable.id, params.data.id));
  if (!convo) {
    res.status(404).json({ error: "Healthcare conversation not found" });
    return;
  }
  const msgs = await db.select().from(healthcareMessagesTable).where(eq(healthcareMessagesTable.conversationId, params.data.id)).orderBy(healthcareMessagesTable.createdAt);
  res.json({ ...convo, messages: msgs });
});

router.delete("/healthcare/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteHealthcareConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [convo] = await db.delete(healthcareConversationsTable).where(eq(healthcareConversationsTable.id, params.data.id)).returning();
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/healthcare/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendHealthcareMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendHealthcareMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [convo] = await db.select().from(healthcareConversationsTable).where(eq(healthcareConversationsTable.id, params.data.id));
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(healthcareMessagesTable).values({ conversationId: params.data.id, role: "user", content: parsed.data.content });
  await db.update(healthcareConversationsTable).set({ updatedAt: new Date() }).where(eq(healthcareConversationsTable.id, params.data.id));

  const history = await db.select().from(healthcareMessagesTable).where(eq(healthcareMessagesTable.conversationId, params.data.id)).orderBy(healthcareMessagesTable.createdAt);

  const specialtyPrompt = convo.specialty !== "general"
    ? ` You specialize in ${convo.specialty} medicine.`
    : "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: HEALTHCARE_SYSTEM_PROMPT + specialtyPrompt },
        ...history.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(healthcareMessagesTable).values({ conversationId: params.data.id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, "Healthcare AI error");
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
  }
  res.end();
});

router.post("/healthcare/analyze-symptoms", async (req, res): Promise<void> => {
  const parsed = AnalyzeSymptomsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { symptoms, age, gender, duration } = parsed.data;
  const patientContext = [
    age ? `Age: ${age}` : "",
    gender ? `Gender: ${gender}` : "",
    duration ? `Duration: ${duration}` : "",
  ].filter(Boolean).join(", ");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: HEALTHCARE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze these symptoms and provide a structured medical information response.
Symptoms: ${symptoms.join(", ")}
${patientContext ? `Patient context: ${patientContext}` : ""}

Respond with a JSON object with this exact structure:
{
  "possibleConditions": [
    {"name": "condition name", "likelihood": "high/medium/low", "description": "brief explanation"}
  ],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "urgencyLevel": "emergency/urgent/moderate/routine"
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed_response = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    res.json({
      disclaimer: "This analysis is for informational purposes only and is not a medical diagnosis. Please consult a qualified healthcare professional for proper medical advice and treatment.",
      possibleConditions: parsed_response.possibleConditions ?? [],
      recommendations: parsed_response.recommendations ?? ["Consult a healthcare professional"],
      urgencyLevel: parsed_response.urgencyLevel ?? "routine",
    });
  } catch (err) {
    logger.error({ err }, "Symptom analysis error");
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
