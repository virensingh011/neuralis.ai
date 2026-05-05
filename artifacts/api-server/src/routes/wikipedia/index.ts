import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const WIKI_API = "https://en.wikipedia.org/api/rest_v1";
const WIKI_SEARCH = "https://en.wikipedia.org/w/api.php";

router.get("/wikipedia/search", async (req, res): Promise<void> => {
  const query = req.query.query as string;
  const limit = parseInt((req.query.limit as string) ?? "8", 10);

  if (!query) {
    res.status(400).json({ error: "Query parameter is required" });
    return;
  }

  try {
    const url = `${WIKI_SEARCH}?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&srprop=snippet&origin=*`;
    const response = await fetch(url);
    const data = await response.json() as {
      query: {
        search: Array<{
          title: string;
          snippet: string;
        }>;
      };
    };

    const results = (data.query?.search ?? []).map((item) => ({
      title: item.title,
      excerpt: item.snippet.replace(/<[^>]*>/g, ""),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      thumbnail: null,
    }));

    res.json(results);
  } catch (err) {
    logger.error({ err }, "Wikipedia search error");
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/wikipedia/summary", async (req, res): Promise<void> => {
  const title = req.query.title as string;

  if (!title) {
    res.status(400).json({ error: "Title parameter is required" });
    return;
  }

  try {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, "_"));
    const summaryRes = await fetch(`${WIKI_API}/page/summary/${encodedTitle}`);

    if (summaryRes.status === 404) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const article = await summaryRes.json() as {
      title: string;
      extract: string;
      content_urls?: { desktop?: { page?: string } };
      thumbnail?: { source?: string };
    };

    const [aiSummaryRes, relatedRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Create an enhanced, engaging summary of this Wikipedia article about "${article.title}". Make it educational and insightful (3-4 sentences). Article text: ${article.extract?.slice(0, 1500)}`,
          },
        ],
      }),
      openai.chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 100,
        messages: [
          {
            role: "user",
            content: `List 5 related topics to "${article.title}" as a comma-separated list. Just the topic names, nothing else.`,
          },
        ],
      }),
    ]);

    const aiSummary = aiSummaryRes.choices[0]?.message?.content ?? article.extract;
    const relatedRaw = relatedRes.choices[0]?.message?.content ?? "";
    const relatedTopics = relatedRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);

    res.json({
      title: article.title,
      extract: article.extract ?? "",
      aiSummary,
      url: article.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodedTitle}`,
      thumbnail: article.thumbnail?.source ?? null,
      relatedTopics,
    });
  } catch (err) {
    logger.error({ err }, "Wikipedia summary error");
    res.status(500).json({ error: "Failed to fetch article summary" });
  }
});

export default router;
