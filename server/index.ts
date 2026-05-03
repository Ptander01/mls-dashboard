import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_BASE_URL = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const GEMINI_API_KEY = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "64kb" }));

  // ─── AI Commentary API Route (powered by Gemini via Replit AI integrations) ───
  app.post("/api/ai-commentary", async (req, res) => {
    try {
      const { systemPrompt, userPrompt, teamId, seasonYear } = req.body;

      if (!systemPrompt || !userPrompt) {
        res.status(400).json({ error: "Missing systemPrompt or userPrompt" });
        return;
      }

      if (!GEMINI_BASE_URL || !GEMINI_API_KEY) {
        res.status(503).json({ error: "AI integration not configured" });
        return;
      }

      const url = `${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text().catch(() => "unknown");
        console.error("[AI Commentary] Gemini error:", geminiRes.status, errText);
        res.status(502).json({ error: `Gemini API error: ${geminiRes.status}` });
        return;
      }

      const data = await geminiRes.json();
      const commentary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!commentary) {
        res.status(502).json({ error: "No response from Gemini" });
        return;
      }

      res.json({
        commentary: commentary.trim(),
        model: GEMINI_MODEL,
        teamId,
        seasonYear,
      });
    } catch (err: any) {
      console.error("[AI Commentary] Error:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
