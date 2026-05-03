import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Gemini — free tier, no credit card needed.
// Get a key at https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = "gemini-1.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "64kb" }));

  // ─── AI Commentary Route (Google Gemini free tier) ───
  app.post("/api/ai-commentary", async (req, res) => {
    try {
      const { systemPrompt, userPrompt, teamId, seasonYear } = req.body;

      if (!systemPrompt || !userPrompt) {
        res.status(400).json({ error: "Missing systemPrompt or userPrompt" });
        return;
      }

      if (!GEMINI_API_KEY) {
        // Graceful fallback — client will use rule-based narrative
        res.status(503).json({ error: "GEMINI_API_KEY not configured" });
        return;
      }

      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            { role: "user", parts: [{ text: userPrompt }] },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown");
        console.error("[AI Commentary] Gemini error:", response.status, errText);
        res.status(502).json({ error: `Gemini API error ${response.status}` });
        return;
      }

      const data = await response.json();
      const commentary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!commentary) {
        res.status(502).json({ error: "Empty response from Gemini" });
        return;
      }

      res.json({ commentary: commentary.trim(), model: GEMINI_MODEL, teamId, seasonYear });
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
