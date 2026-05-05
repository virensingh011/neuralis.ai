import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, studySessionsTable, flashcardsTable, quizQuestionsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateStudySessionBody,
  GetStudySessionParams,
  DeleteStudySessionParams,
  ListFlashcardsParams,
  GenerateFlashcardsBody,
  GenerateFlashcardsParams,
  GenerateQuizBody,
  GenerateQuizParams,
  SummarizeTextBody,
  ExplainConceptBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/study/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select({
    id: studySessionsTable.id,
    title: studySessionsTable.title,
    subject: studySessionsTable.subject,
    createdAt: studySessionsTable.createdAt,
    updatedAt: studySessionsTable.updatedAt,
    flashcardCount: count(flashcardsTable.id),
    quizCount: sql<number>`0`,
  }).from(studySessionsTable)
    .leftJoin(flashcardsTable, eq(flashcardsTable.sessionId, studySessionsTable.id))
    .groupBy(studySessionsTable.id)
    .orderBy(desc(studySessionsTable.updatedAt));
  res.json(sessions);
});

router.post("/study/sessions", async (req, res): Promise<void> => {
  const parsed = CreateStudySessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db.insert(studySessionsTable).values(parsed.data).returning();
  res.status(201).json({ ...session, flashcardCount: 0, quizCount: 0 });
});

router.get("/study/sessions/:id", async (req, res): Promise<void> => {
  const params = GetStudySessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db.select().from(studySessionsTable).where(eq(studySessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Study session not found" });
    return;
  }
  const [cards, questions] = await Promise.all([
    db.select().from(flashcardsTable).where(eq(flashcardsTable.sessionId, params.data.id)),
    db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.sessionId, params.data.id)),
  ]);

  const parsedQuestions = questions.map(q => ({
    ...q,
    options: JSON.parse(q.options) as string[],
  }));

  res.json({
    ...session,
    flashcardCount: cards.length,
    quizCount: questions.length,
    flashcards: cards,
    quizQuestions: parsedQuestions,
  });
});

router.delete("/study/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteStudySessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db.delete(studySessionsTable).where(eq(studySessionsTable.id, params.data.id)).returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/study/sessions/:id/flashcards", async (req, res): Promise<void> => {
  const params = ListFlashcardsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const cards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.sessionId, params.data.id));
  res.json(cards);
});

router.post("/study/sessions/:id/flashcards", async (req, res): Promise<void> => {
  const params = GenerateFlashcardsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = GenerateFlashcardsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const count_num = parsed.data.count ?? 8;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are Neuralis Study AI. Generate high-quality educational flashcards like a Harvard or MIT professor would. Make cards specific, memorable, and pedagogically sound.",
        },
        {
          role: "user",
          content: `Generate ${count_num} flashcards from this text. Return JSON array only:
[{"front": "question/concept", "back": "answer/explanation", "difficulty": "easy|medium|hard"}]

Text: ${parsed.data.text.slice(0, 3000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const cardsData = jsonMatch ? JSON.parse(jsonMatch[0]) as Array<{ front: string; back: string; difficulty: string }> : [];

    const inserted = await Promise.all(
      cardsData.map(card =>
        db.insert(flashcardsTable).values({
          sessionId: params.data.id,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty ?? "medium",
        }).returning()
      )
    );

    await db.update(studySessionsTable).set({ updatedAt: new Date() }).where(eq(studySessionsTable.id, params.data.id));
    res.status(201).json(inserted.map(r => r[0]).filter(Boolean));
  } catch (err) {
    logger.error({ err }, "Flashcard generation error");
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

router.post("/study/sessions/:id/quiz", async (req, res): Promise<void> => {
  const params = GenerateQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = GenerateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const numQuestions = parsed.data.count ?? 5;
  const difficulty = parsed.data.difficulty ?? "medium";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `You are Neuralis Study AI. Generate ${difficulty} difficulty multiple-choice quiz questions like a rigorous academic exam. Make questions that test deep understanding, not just memorization.`,
        },
        {
          role: "user",
          content: `Generate ${numQuestions} multiple-choice questions. Return JSON array only:
[{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "why this answer is correct"}]

Text: ${parsed.data.text.slice(0, 3000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const questionsData = jsonMatch ? JSON.parse(jsonMatch[0]) as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }> : [];

    const inserted = await Promise.all(
      questionsData.map(q =>
        db.insert(quizQuestionsTable).values({
          sessionId: params.data.id,
          question: q.question,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }).returning()
      )
    );

    await db.update(studySessionsTable).set({ updatedAt: new Date() }).where(eq(studySessionsTable.id, params.data.id));

    res.status(201).json(inserted.map(r => r[0]).filter(Boolean).map(q => ({
      ...q,
      options: JSON.parse(q!.options) as string[],
    })));
  } catch (err) {
    logger.error({ err }, "Quiz generation error");
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

router.post("/study/summarize", async (req, res): Promise<void> => {
  const parsed = SummarizeTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const stylePrompts: Record<string, string> = {
    brief: "Create a very concise summary (2-3 sentences) capturing only the key points.",
    detailed: "Create a comprehensive, detailed summary preserving all important information and nuances.",
    bullet: "Summarize as clear bullet points, each capturing one key idea.",
    academic: "Create an academic-style summary with formal language, highlighting methodology, findings, and implications.",
  };

  const style = parsed.data.style ?? "detailed";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are Neuralis Study AI, an expert educational summarizer. Produce summaries that would satisfy a Harvard professor — accurate, insightful, and well-structured.",
        },
        {
          role: "user",
          content: `${stylePrompts[style] ?? stylePrompts.detailed}

Then list 5 key points as a JSON response:
{"summary": "...", "keyPoints": ["point1", "point2", ...]}

Text: ${parsed.data.text.slice(0, 5000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) as { summary: string; keyPoints: string[] } : { summary: content, keyPoints: [] };

    res.json({
      summary: result.summary ?? content,
      keyPoints: result.keyPoints ?? [],
      wordCount: parsed.data.text.split(/\s+/).length,
    });
  } catch (err) {
    logger.error({ err }, "Summarization error");
    res.status(500).json({ error: "Summarization failed" });
  }
});

router.post("/study/explain", async (req, res): Promise<void> => {
  const parsed = ExplainConceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const levelPrompts: Record<string, string> = {
    beginner: "Explain in simple terms anyone can understand. Use everyday analogies and avoid jargon.",
    intermediate: "Explain with moderate depth. Assume basic knowledge of the subject.",
    advanced: "Explain at an advanced level with technical depth and precision.",
    expert: "Explain at an expert level, assuming deep domain knowledge. Be rigorous and precise.",
  };

  const level = parsed.data.level ?? "intermediate";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are Neuralis Study AI, an expert educator combining the rigor of MIT and the breadth of Harvard. ${levelPrompts[level] ?? levelPrompts.intermediate}`,
        },
        {
          role: "user",
          content: `Explain: "${parsed.data.concept}"${parsed.data.subject ? ` in the context of ${parsed.data.subject}` : ""}. Be thorough, engaging, and educational. Use examples, analogies, and structure your explanation clearly.`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, "Explanation streaming error");
    res.write(`data: ${JSON.stringify({ error: "AI service error" })}\n\n`);
  }
  res.end();
});

router.get("/study/stats", async (_req, res): Promise<void> => {
  const [totals] = await db.select({
    totalSessions: count(studySessionsTable.id),
  }).from(studySessionsTable);

  const [flashTotals] = await db.select({
    totalFlashcards: count(flashcardsTable.id),
  }).from(flashcardsTable);

  const [quizTotals] = await db.select({
    totalQuizzes: count(quizQuestionsTable.id),
  }).from(quizQuestionsTable);

  const breakdown = await db.select({
    subject: studySessionsTable.subject,
    sessionCount: count(studySessionsTable.id),
  }).from(studySessionsTable).groupBy(studySessionsTable.subject);

  res.json({
    totalSessions: Number(totals?.totalSessions ?? 0),
    totalFlashcards: Number(flashTotals?.totalFlashcards ?? 0),
    totalQuizzes: Number(quizTotals?.totalQuizzes ?? 0),
    subjectBreakdown: breakdown.map(b => ({ subject: b.subject, sessionCount: Number(b.sessionCount) })),
  });
});

export default router;
