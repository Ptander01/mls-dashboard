import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAI client (uses OPENAI_API_KEY and OPENAI_BASE_URL from env)
const openai = new OpenAI();

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies for API routes
  app.use(express.json({ limit: "64kb" }));

  // ─── AI Commentary API Route ───
  app.post("/api/ai-commentary", async (req, res) => {
    try {
      const { systemPrompt, userPrompt, teamId, seasonYear } = req.body;

      if (!systemPrompt || !userPrompt) {
        res.status(400).json({ error: "Missing systemPrompt or userPrompt" });
        return;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const commentary = completion.choices?.[0]?.message?.content;

      if (!commentary) {
        res.status(502).json({ error: "No response from AI model" });
        return;
      }

      res.json({
        commentary: commentary.trim(),
        model: "gpt-4.1-mini",
        teamId,
        seasonYear,
      });
    } catch (err: any) {
      console.error("[AI Commentary] Error:", err.message || err);
      const status = err.status || err.statusCode || 500;
      const message =
        err.message || "Internal server error during AI commentary generation";
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
