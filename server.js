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
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
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
async function callGroq(messages, temperature = 0.7, maxTokens = 4096) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
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
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Clean JSON from Groq response ───────────────────────────────────────────
function cleanJson(raw) {
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  text = text.replace(/[\x00-\x1F\x7F]/g, (c) =>
    c === "\n" || c === "\r" || c === "\t" ? c : ""
  );

  // First try clean parse
  try { return JSON.parse(text); } catch(e) {}

  // Truncated array recovery: cut off broken last element and close the JSON
  try {
    // Find the last complete object in each array by trimming to last clean },
    let fixed = text;
    // Remove trailing incomplete object — find last }, or }] and close everything after
    fixed = fixed.replace(/,\s*\{[^}]*$/, ""); // remove trailing incomplete {
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, ""); // remove trailing broken key:value
    // Close any unclosed arrays and objects
    const opens = (fixed.match(/\[/g)||[]).length - (fixed.match(/\]/g)||[]).length;
    const objs  = (fixed.match(/\{/g)||[]).length - (fixed.match(/\}/g)||[]).length;
    for (let i = 0; i < objs; i++)  fixed += "}";
    for (let i = 0; i < opens; i++) fixed += "]";
    return JSON.parse(fixed);
  } catch(e) {
    throw new Error("JSON unrecoverable: " + e.message);
  }
}

// ─── ROUTE 1: POST /generate ──────────────────────────────────────────────────
app.post("/generate", upload.array("pyqs", 5), async (req, res) => {
  try {
    const { university, subject, semester, format, hours, weakTopics } = req.body;
    const files = req.files || [];
    const isEmergency = parseInt(hours) <= 3;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Extract text from all uploaded PDFs
    let pyqText = "";
    for (const file of files) {
      const text = await extractPdfText(file.path);
      pyqText += `\n\n--- Paper: ${file.originalname} ---\n${text.slice(0, 300)}`;
      fs.unlink(file.path, () => {});
    }

    // ── Call 1: Analysis + Topics + Schedule (NO predicted paper) ──
    const prompt1 = `You are an expert AI exam analyst for Indian engineering universities.
University: ${university}, Subject: ${subject}, Semester: ${semester}, Format: ${format}, Hours: ${hours}
Weak Topics: ${weakTopics || "None"}
PYQ Text: ${pyqText || "No papers uploaded."}

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "universityDNA": "2-3 sentences about this university exam style and marking pattern",
  "emergencyMode": ${isEmergency},
  "topicFrequency": [
    {"topic": "Topic Name", "appearances": 4, "lastYear": 2023, "avgMarks": 16}
  ],
  "topics": [
    {
      "name": "Topic Name",
      "priority": "MUST DO",
      "confidence": 90,
      "expectedMarks": 16,
      "hoursNeeded": 2,
      "reason": "Brief reason",
      "cheatSheet": {
        "definition": "One sentence definition",
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "formulas": ["Formula 1"],
        "diagram": "What to draw",
        "examTip": "One exam tip"
      },
      "selfTest": {
        "twoMark": ["Q1"],
        "eightMark": ["Q1"],
        "sixteenMark": ["Q1"]
      }
    }
  ],
  "schedule": [
    {"hour": 1, "task": "Task description", "topic": "Topic name", "type": "study"}
  ]
}
Rules:
- topics: exactly 5 items, priority values: MUST DO / HIGH / MEDIUM / SKIP
- topicFrequency: exactly 4 items
- schedule: exactly ${Math.min(parseInt(hours) || 8, 8)} items, type is study or break
- Keep entire response under 2500 tokens — be concise`;

    const raw1 = await callGroq([{ role: "user", content: prompt1 }], 0.6, 2500);
    let battlePlan;
    try {
      battlePlan = cleanJson(raw1);
    } catch (e) {
      console.error("JSON parse failed:", e.message);
      return res.status(500).json({ error: "AI response parsing failed. Try again." });
    }

    await sleep(65000);

    // ── Call 2: Section A ──
    const sectionAPrompt = `You are an exam paper setter for ${subject} at ${university}, ${semester}.
Generate Section A with 8 short-answer questions and model answers.
Respond ONLY with valid JSON, no markdown:
{
  "sectionA": [
    {"qNo": 1, "question": "Question text", "marks": 2, "topic": "Topic", "answer": "2-3 sentence model answer"}
  ]
}
Rules: exactly 8 questions, cover all major topics, keep under 2000 tokens.`;

    const rawA = await callGroq([{ role: "user", content: sectionAPrompt }], 0.5, 2000);
    let sectionA = [];
    try { sectionA = cleanJson(rawA).sectionA || []; } catch(e) { console.error("SectionA fail:", e.message); }

    await sleep(65000);

    // ── Call 3: Section B ──
    const sectionBPrompt = `You are an exam paper setter for ${subject} at ${university}, ${semester}.
Generate Section B with 5 medium-answer questions and model answers.
Respond ONLY with valid JSON, no markdown:
{
  "sectionB": [
    {"qNo": 1, "question": "Question text", "marks": 8, "topic": "Topic", "answer": "Detailed answer in 4-6 sentences", "diagram": "Diagram description or empty string", "numerical": "Full working or empty string"}
  ]
}
Rules: exactly 5 questions, answers concise but complete, keep under 2500 tokens.`;

    const rawB = await callGroq([{ role: "user", content: sectionBPrompt }], 0.5, 2500);
    let sectionB = [];
    try { sectionB = cleanJson(rawB).sectionB || []; } catch(e) { console.error("SectionB fail:", e.message); }

    await sleep(65000);

    // ── Call 4: Section C ──
    const sectionCPrompt = `You are an exam paper setter for ${subject} at ${university}, ${semester}.
Generate Section C with 4 long-answer questions and model answers.
Respond ONLY with valid JSON, no markdown:
{
  "sectionC": [
    {"qNo": 1, "question": "Question text", "marks": 16, "topic": "Topic", "answer": "Answer in 6-8 sentences as continuous prose", "diagram": "Diagram description or empty string", "numerical": "Full working or empty string"}
  ]
}
Rules: exactly 4 questions, answers thorough but concise, keep under 2500 tokens.`;

    const rawC = await callGroq([{ role: "user", content: sectionCPrompt }], 0.5, 2500);
    let sectionC = [];
    try { sectionC = cleanJson(rawC).sectionC || []; } catch(e) { console.error("SectionC fail:", e.message); }

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

    // Subject-aware channel filter
    const subjectLower = (subject || "").toLowerCase();
    let channelFilter = "Gate Smashers|Neso Academy|NPTEL";
    if (/math|calculus|algebra|statistics/.test(subjectLower)) {
      channelFilter = "Khan Academy|PatrickJMT|3Blue1Brown|NPTEL";
    } else if (/electron|circuit|signal|analog|digital/.test(subjectLower)) {
      channelFilter = "Neso Academy|ALL ABOUT ELECTRONICS|Engineering Funda";
    } else if (/os|network|algorithm|data struct|compiler/.test(subjectLower)) {
      channelFilter =
        "Gate Smashers|Jenny's Lectures|Knowledge Gate|Neso Academy";
    }

    const results = {};
    const topicList = Array.isArray(topics)
      ? topics.slice(0, 5)
      : [topics];

    for (const topic of topicList) {
      const query = `${topic} ${subject} engineering exam revision ${channelFilter.split("|")[0]}`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=2&key=${process.env.YOUTUBE_API_KEY}`;

      const ytRes = await fetch(url);
      const ytData = await ytRes.json();

      if (ytData.items && ytData.items.length > 0) {
        results[topic] = ytData.items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium.url,
          watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }));
      } else {
        results[topic] = [];
      }
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
      ...history,
      { role: "user", content: question },
    ];

    const reply = await callGroq(messages, 0.85, 512);
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

Grade this answer strictly as an Indian university examiner would. 

Respond ONLY with valid JSON (no markdown):
{
  "scored": <number>,
  "maxMarks": ${maxMarks},
  "modelAnswer": "The ideal answer in 3-5 sentences",
  "missed": "What the student missed or got wrong",
  "tip": "One specific improvement tip for next time"
}`;

    const raw = await callGroq(
      [{ role: "user", content: prompt }],
      0.3,
      512
    );

    let result;
    try {
      result = cleanJson(raw);
    } catch (e) {
      return res.status(500).json({ error: "Grading parse failed" });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Grade error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ─── ROUTE 5: POST /teach ───────────────────────────────────────────────────
app.post("/teach", async (req, res) => {
  try {
    const { topic, task, subject, university, hours } = req.body;

    const prompt = `You are an expert Indian engineering teacher. A student has ${hours} hours left to study and needs to learn "${topic}" for their ${subject} exam at ${university} RIGHT NOW.

Teach this topic in a fast, exam-focused way. Be like a brilliant senior who knows exactly what the examiner wants.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "hook": "One punchy sentence that makes the student instantly get what this topic is about",
  "coreConcept": "The core concept explained in 4-6 sentences. Simple language. No jargon without explanation.",
  "keyPoints": ["Exactly what examiner wants — point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "formula": "The most important formula or algorithm if applicable. Empty string if not needed.",
  "diagramSteps": "Step-by-step instructions to draw the most important diagram for this topic. Empty string if no diagram needed.",
  "memoryTrick": "One clever trick, acronym, or analogy to remember this topic forever",
  "examWarning": "The #1 mistake students make on this topic in exams and how to avoid it",
  "quickQuiz": "One 2-mark question the examiner is likely to ask, with its model answer in 2 sentences"
}`;

    const raw = await callGroq([{ role: "user", content: prompt }], 0.7, 2000);
    let lesson;
    try { lesson = cleanJson(raw); }
    catch(e) { return res.status(500).json({ error: "Lesson parse failed. Try again." }); }

    res.json({ success: true, data: lesson });
  } catch(err) {
    console.error("Teach error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚔️  COLOSSEUM running at http://localhost:${PORT}`);
});
