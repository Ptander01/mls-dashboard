/**
 * api/ai-commentary.js — Vercel Serverless Function
 *
 * Vercel automatically exposes files in /api/ as endpoints.
 * This handles POST /api/ai-commentary using Google Gemini (free tier).
 *
 * Set GEMINI_API_KEY in Vercel Environment Variables to enable.
 * Free key: https://aistudio.google.com/app/apikey
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = "gemini-1.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { systemPrompt, userPrompt, teamId, seasonYear } = req.body || {};

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: "Missing systemPrompt or userPrompt" });
  }

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "unknown");
      console.error("[ai-commentary] Gemini error:", geminiRes.status, errText);
      return res.status(502).json({ error: `Gemini API error ${geminiRes.status}` });
    }

    const data = await geminiRes.json();
    const commentary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!commentary) {
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    return res.status(200).json({
      commentary: commentary.trim(),
      model: GEMINI_MODEL,
      teamId,
      seasonYear,
    });
  } catch (err) {
    console.error("[ai-commentary] Error:", err.message || err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
