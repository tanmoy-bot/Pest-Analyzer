import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50kb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / server-to-server calls (no Origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);

/* -------------------------------------------------------------
   Extremely small in-memory rate limiter (per IP).
   Good enough for a student project / demo; swap for a real
   store (Redis) if you deploy this beyond a hobby scale.
------------------------------------------------------------- */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  hits.set(ip, entry);

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }
  next();
}

/* -------------------------------------------------------------
   Prompt construction
------------------------------------------------------------- */
const SYSTEM_PROMPT = `You are an agricultural extension advisor specialising in stored-grain
insect pest management for smallholder and marginal farmers in South Asia.

You will be given a pest species (possibly with a common name), a crop, a storage
type, and optionally a region and symptom description. Respond with practical,
locally-realistic advice.

Always structure your answer as a single JSON object with EXACTLY this shape,
and no text outside the JSON:

{
  "species": "string - the species name as given or corrected",
  "commonName": "string - common name of the pest",
  "riskLevel": "Low | Moderate | High | Severe",
  "summary": "1-2 sentence plain-language summary of the risk",
  "prevention": ["short actionable bullet", "..."],
  "storageAdvice": ["short actionable bullet about how to store the grain to prevent this pest", "..."],
  "chemicalOptions": [
    { "name": "commonly-labelled product/active ingredient category, e.g. 'Malathion dust (as per label)'",
      "notes": "when/how it is typically used, general safety notes -- do NOT invent exact dosages; instruct the farmer to follow the product label and consult their local Krishi Vigyan Kendra / agricultural extension officer for exact application rates" }
  ],
  "nonChemicalOptions": ["e.g. neem leaf admixture, diatomaceous earth, solar heat treatment, hermetic (airtight) bagging, sun-drying to safe moisture content, etc."],
  "disclaimer": "short disclaimer noting this is general AI-generated guidance, not a substitute for a licensed agronomist or the product label"
}

Keep each bullet short (under ~18 words). Be specific to the species where you can
(e.g. Rhyzopertha dominica bores into kernels so surface-only treatments are less
effective; Sitophilus oryzae adults fly and can re-infest; Tribolium castaneum
thrives in grain dust/residue so cleaning matters a lot). If you are not confident
about a claim, say so briefly rather than inventing specifics.`;

function buildUserPrompt({ pest, crop, storageType, region, symptoms }) {
  return [
    `Pest / species: ${pest || "unknown - please ask the user to identify from symptoms"}`,
    `Crop: ${crop || "not specified"}`,
    `Storage type: ${storageType || "not specified"}`,
    `Region: ${region || "not specified"}`,
    symptoms ? `Observed symptoms: ${symptoms}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/* -------------------------------------------------------------
   Routes
------------------------------------------------------------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const CHAT_SYSTEM_PROMPT = `You are the same stored-grain pest advisor as before, now answering a
short follow-up question in plain conversational text (NOT JSON). Keep answers under
120 words, practical, and specific to smallholder South Asian farming conditions.
If the question drifts toward exact pesticide dosages, remind the user to follow the
product label and consult their local Krishi Vigyan Kendra / agricultural extension
officer instead of inventing a number.`;

app.post("/api/advise", rateLimit, async (req, res) => {
  const { pest, crop, storageType, region, symptoms, history, mode, question } = req.body || {};

  if (mode !== "chat" && !pest && !symptoms) {
    return res.status(400).json({ error: "Please provide at least a pest name or a symptom description." });
  }
  if (mode === "chat" && !question) {
    return res.status(400).json({ error: "Missing follow-up question." });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server is missing OPENROUTER_API_KEY. Set it in server/.env." });
  }

  const messages =
    mode === "chat"
      ? [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          ...(Array.isArray(history) ? history.slice(-8) : []),
          { role: "user", content: question },
        ]
      : [
          { role: "system", content: SYSTEM_PROMPT },
          ...(Array.isArray(history) ? history.slice(-6) : []),
          { role: "user", content: buildUserPrompt({ pest, crop, storageType, region, symptoms }) },
        ];

  try {
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5173",
        "X-Title": "EcoSterile Pest Advisor",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        temperature: 0.3,
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("OpenRouter error:", upstream.status, errText);
      return res.status(502).json({ error: "The advice service is temporarily unavailable. Please try again shortly." });
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";

    if (mode === "chat") {
      return res.json({ reply: raw });
    }

    let advice;
    try {
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      advice = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch {
      // Model didn't return clean JSON -- fall back to showing raw text
      advice = {
        species: pest || "Unknown",
        commonName: "",
        riskLevel: "Unknown",
        summary: "The advisor responded, but not in the expected format. Showing the raw answer below.",
        prevention: [],
        storageAdvice: [],
        chemicalOptions: [],
        nonChemicalOptions: [],
        disclaimer: raw,
      };
    }

    res.json({ advice, reply: raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong talking to the advice service." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pest advisor server running on http://localhost:${PORT}`));
