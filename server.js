require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Multer (PDF Upload) ──────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDFs allowed"));
  },
});

// ─── PDF Text Extraction ──────────────────────────────────────────────────────
async function extractPdfText(filePath) {
  try {
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  } catch (err) {
    console.error("PDF parse error:", err.message);
    return "";
  }
}

// ─── Groq API Call ────────────────────────────────────────────────────────────
async function callGroq(messages, temperature = 0.7, maxTokens = 1024) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Auto-retry on rate limit ─────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGroqWithRetry(messages, temp, maxTok) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await callGroq(messages, temp, maxTok);
    } catch (e) {
      const msg = e.message || "";
      const wait = msg.match(/try again in (\d+(\.\d+)?)s/i);
      if (wait) {
        const ms = Math.ceil(parseFloat(wait[1])) * 1000 + 1000;
        console.log(`Rate limited, retrying in ${ms}ms...`);
        await sleep(ms);
      } else {
        throw e;
      }
    }
  }
  throw new Error("Rate limit retries exhausted");
}

// ─── Clean JSON ───────────────────────────────────────────────────────────────
function cleanJson(raw) {
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  text = text.replace(/[\x00-\x1F\x7F]/g, (c) =>
    c === "\n" || c === "\r" || c === "\t" ? c : ""
  );
  try { return JSON.parse(text); } catch (e) {}
  try {
    let fixed = text;
    fixed = fixed.replace(/,\s*\{[^}]*$/, "");
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
    const opens = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    const objs  = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (let i = 0; i < objs; i++)  fixed += "}";
    for (let i = 0; i < opens; i++) fixed += "]";
    return JSON.parse(fixed);
  } catch (e) {
    throw new Error("JSON unrecoverable: " + e.message);
  }
}

// ─── ROUTE 1: POST /generate ──────────────────────────────────────────────────
app.post("/generate", upload.array("pyqs", 5), async (req, res) => {
  try {
    const { university, subject, semester, format, hours, weakTopics } = req.body;
    const files = req.files || [];
    const isEmergency = parseInt(hours) <= 3;
    const scheduleCount = Math.min(parseInt(hours) || 8, 8);

    let pyqText = "";
    for (const file of files) {
      const text = await extractPdfText(file.path);
      pyqText += text.slice(0, 200);
      fs.unlink(file.path, () => {});
    }

    // ── Call 1: Battle Plan (topics + schedule) ──
    const prompt1 = `Expert exam analyst. Indian engineering university.
University: ${university} | Subject: ${subject} | Sem: ${semester} | Format: ${format} | Hours: ${hours} | Weak: ${weakTopics || "None"}
${pyqText ? "PYQ hint: " + pyqText : ""}

Respond ONLY valid JSON no markdown:
{
  "universityDNA": "2-3 sentences on exam style",
  "emergencyMode": ${isEmergency},
  "topicFrequency": [{"topic":"T","appearances":3,"lastYear":2023,"avgMarks":8}],
  "topics": [{
    "name":"Topic","priority":"MUST DO","confidence":85,"expectedMarks":16,"hoursNeeded":2,"reason":"short reason",
    "cheatSheet":{"definition":"def","keyPoints":["p1","p2","p3"],"formulas":["f1"],"diagram":"draw this","examTip":"tip"},
    "selfTest":{"twoMark":["Q1"],"eightMark":["Q1"],"sixteenMark":["Q1"]}
  }],
  "schedule":[{"hour":1,"task":"task","topic":"topic","type":"study"}]
}
Rules: 5 topics, priority: MUST DO/HIGH/MEDIUM/SKIP, 4 topicFrequency, ${scheduleCount} schedule items.
${isEmergency ? `EMERGENCY MODE: ${scheduleCount} hours only. Each schedule item MUST cover a DIFFERENT topic. Spread all 5 topics across the ${scheduleCount} slots — combine topics if needed. Every slot must have a specific topic name, not "all".` : ""}
Each schedule item MUST have a specific topic name in the "topic" field — never use "all" or "general". Be concise.`;

    const raw1 = await callGroqWithRetry([{ role: "user", content: prompt1 }], 0.6, 1500);
    let battlePlan;
    try { battlePlan = cleanJson(raw1); }
    catch (e) {
      console.error("JSON parse failed:", e.message);
      return res.status(500).json({ error: "AI response parsing failed. Try again." });
    }

    await sleep(1500);

    // ── Call 2: Section A (5 short questions) ──
    const promptA = `Exam setter for ${subject}, ${university}, ${semester}.
Respond ONLY valid JSON no markdown:
{"sectionA":[{"qNo":1,"question":"Q","marks":2,"topic":"T","answer":"2-3 sentence model answer"}]}
Rules: exactly 5 questions, cover major topics, concise answers, under 900 tokens.`;

    const rawA = await callGroqWithRetry([{ role: "user", content: promptA }], 0.5, 900);
    let sectionA = [];
    try { sectionA = cleanJson(rawA).sectionA || []; } catch (e) { console.error("SectionA fail:", e.message); }

    await sleep(1500);

    // ── Call 3: Section B + C together ──
    const promptBC = `Exam setter for ${subject}, ${university}, ${semester}.
Respond ONLY valid JSON no markdown:
{
  "sectionB":[{"qNo":1,"question":"Q","marks":8,"topic":"T","answer":"4-6 sentence answer","diagram":"","numerical":""}],
  "sectionC":[{"qNo":1,"question":"Q","marks":16,"topic":"T","answer":"6-8 sentence answer","diagram":"","numerical":""}]
}
Rules: sectionB exactly 3 questions, sectionC exactly 2 questions. Answers thorough but concise. Under 1500 tokens total.`;

    const rawBC = await callGroqWithRetry([{ role: "user", content: promptBC }], 0.5, 1500);
    let sectionB = [], sectionC = [];
    try {
      const parsed = cleanJson(rawBC);
      sectionB = parsed.sectionB || [];
      sectionC = parsed.sectionC || [];
    } catch (e) { console.error("SectionBC fail:", e.message); }

    battlePlan.predictedPaper = {
      title: `${subject} — Predicted Question Paper (${university})`,
      sectionA,
      sectionB,
      sectionC,
    };

    res.json({ success: true, data: battlePlan });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});

// ─── ROUTE 2: POST /youtube ───────────────────────────────────────────────────
app.post("/youtube", async (req, res) => {
  try {
    const { topics, subject, university } = req.body;

    const subjectLower = (subject || "").toLowerCase();
    let channelFilter = "Gate Smashers|Neso Academy|NPTEL";
    if (/math|calculus|algebra|statistics/.test(subjectLower)) {
      channelFilter = "Khan Academy|PatrickJMT|3Blue1Brown|NPTEL";
    } else if (/electron|circuit|signal|analog|digital/.test(subjectLower)) {
      channelFilter = "Neso Academy|ALL ABOUT ELECTRONICS|Engineering Funda";
    } else if (/os|network|algorithm|data struct|compiler/.test(subjectLower)) {
      channelFilter = "Gate Smashers|Jenny's Lectures|Knowledge Gate|Neso Academy";
    }

    const results = {};
    const topicList = Array.isArray(topics) ? topics.slice(0, 5) : [topics];

    for (const topic of topicList) {
      const query = `${topic} ${subject} engineering exam revision ${channelFilter.split("|")[0]}`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=2&key=${process.env.YOUTUBE_API_KEY}`;
      const ytRes = await fetch(url);
      const ytData = await ytRes.json();
      results[topic] = (ytData.items || []).map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("YouTube error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE 3: POST /bhaiya ────────────────────────────────────────────────────
app.post("/bhaiya", async (req, res) => {
  try {
    const { question, subject, university, history = [] } = req.body;

    const systemPrompt = `You are Senior Bhaiya — a friendly, brilliant final-year Indian engineering student who has aced every exam at ${university || "your university"}.
You speak like a real senior: casual, confident, a bit funny, very practical. Mix Hindi words naturally (yaar, bhai, dekh, ek kaam kar, chill maar, sahi hai).
You give shortcuts, memory tricks, and exam tips. You NEVER give vague answers — always specific, actionable, relevant to ${subject || "the subject"}.
Keep responses under 150 words. Be the senior everyone wishes they had.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: question },
    ];

    const reply = await callGroqWithRetry(messages, 0.85, 400);
    res.json({ success: true, reply });
  } catch (err) {
    console.error("Bhaiya error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE 4: POST /grade ─────────────────────────────────────────────────────
app.post("/grade", async (req, res) => {
  try {
    const { question, answer, maxMarks, subject } = req.body;

    const prompt = `You are a strict but fair Indian university examiner grading a ${subject} exam answer.

QUESTION: ${question}
MAX MARKS: ${maxMarks}
STUDENT ANSWER: ${answer}

Respond ONLY with valid JSON (no markdown):
{"scored":<number>,"maxMarks":${maxMarks},"modelAnswer":"ideal answer in 3-5 sentences","missed":"what student missed","tip":"one improvement tip"}`;

    const raw = await callGroqWithRetry([{ role: "user", content: prompt }], 0.3, 400);
    let result;
    try { result = cleanJson(raw); }
    catch (e) { return res.status(500).json({ error: "Grading parse failed" }); }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Grade error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE 5: POST /teach ────────────────────────────────────────────────────
app.post("/teach", async (req, res) => {
  try {
    const { topic, task, subject, university, hours } = req.body;

    const prompt = `You are an expert Indian engineering teacher. A student has ${hours} hours left to study and needs to learn "${topic}" for their ${subject} exam at ${university} RIGHT NOW.

Teach this topic in a fast, exam-focused way. Be like a brilliant senior who knows exactly what the examiner wants.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "hook": "One punchy sentence that makes the student instantly get what this topic is about",
  "coreConcept": "Core concept in 4-6 sentences. Simple language.",
  "keyPoints": ["Examiner wants this — point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "formula": "Key formula or algorithm. Empty string if none.",
  "diagramSteps": "Step-by-step instructions to draw the key diagram. Empty string if none.",
  "memoryTrick": "One clever trick or acronym to remember this topic",
  "examWarning": "The #1 mistake students make and how to avoid it",
  "quickQuiz": "One likely 2-mark question with its model answer in 2 sentences"
}`;

    const raw = await callGroqWithRetry([{ role: "user", content: prompt }], 0.7, 800);
    let lesson;
    try { lesson = cleanJson(raw); }
    catch (e) { return res.status(500).json({ error: "Lesson parse failed. Try again." }); }

    // Fetch YouTube videos for this specific topic
    let ytVideos = [];
    try {
      const ytQuery = encodeURIComponent(`${topic} ${subject} exam explained`);
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${ytQuery}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
      );
      const ytData = await ytRes.json();
      ytVideos = (ytData.items || []).map(item => ({
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails.medium.url,
        href: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch(ytErr) {
      console.error("YT fetch error:", ytErr.message);
    }

    res.json({ success: true, data: lesson, ytVideos });
  } catch(err) {
    console.error("Teach error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚔️  COLOSSEUM running at http://localhost:${PORT}`);
});