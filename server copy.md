require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const app = express();
const PORT = process.env.PORT || 3000;

// ─── SQL.js SQLite Setup (pure JS, no compiler needed) ────────────────────────
const initSqlJs = require("sql.js");
const DB_PATH = path.join(__dirname, "colosseum.db");

let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_points INTEGER DEFAULT 0,
      mins_studied INTEGER DEFAULT 0,
      topics_done INTEGER DEFAULT 0,
      times_redeemed INTEGER DEFAULT 0,
      history TEXT DEFAULT '[]',
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper wrappers to match better-sqlite3 API style
const dbGet = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
};

const dbAll = (sql, params = []) => {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
};

const dbRun = (sql, params = []) => {
  db.run(sql, params);
  const lastId = dbGet("SELECT last_insert_rowid() as id");
  saveDb();
  return { lastInsertRowid: lastId ? lastId.id : null };
};

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "colosseum-hackathon-secret-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(express.static(path.join(__dirname, "public")));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = dbGet("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const result = dbRun("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name.trim(), email.toLowerCase().trim(), hash]);

    dbRun("INSERT INTO progress (user_id) VALUES (?)", [result.lastInsertRowid]);

    req.session.userId = result.lastInsertRowid;
    req.session.userName = name.trim();

    res.json({ success: true, user: { id: result.lastInsertRowid, name: name.trim(), email } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const user = dbGet("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    req.session.userId = user.id;
    req.session.userName = user.name;

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /auth/me — check session
app.get("/auth/me", (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const user = dbGet("SELECT id, name, email FROM users WHERE id = ?", [req.session.userId]);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user });
});

// ─── PROGRESS ROUTES ──────────────────────────────────────────────────────────

// GET /progress — get current user's progress
app.get("/progress", requireAuth, (req, res) => {
  const row = dbGet("SELECT * FROM progress WHERE user_id = ?", [req.session.userId]);
  if (!row) return res.json({ total: 0, history: [], stats: { minsStudied: 0, topicsDone: 0, timesRedeemed: 0 } });
  res.json({
    total: row.total_points,
    history: JSON.parse(row.history || "[]"),
    stats: {
      minsStudied: row.mins_studied,
      topicsDone: row.topics_done,
      timesRedeemed: row.times_redeemed
    }
  });
});

// POST /progress — save points update
app.post("/progress", requireAuth, (req, res) => {
  try {
    const { total, history, stats } = req.body;
    dbRun("UPDATE progress SET total_points=?, history=?, mins_studied=?, topics_done=?, times_redeemed=? WHERE user_id=?", [total, JSON.stringify((history||[]).slice(0,100)), stats?.minsStudied||0, stats?.topicsDone||0, stats?.timesRedeemed||0, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Progress save error:", err);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

// GET /leaderboard — top 10 users by points
app.get("/leaderboard", requireAuth, (req, res) => {
  const rows = dbAll(`SELECT u.name, p.total_points, p.topics_done, p.mins_studied FROM users u JOIN progress p ON u.id = p.user_id ORDER BY p.total_points DESC LIMIT 10`);
  const myRow = dbGet("SELECT total_points FROM progress WHERE user_id = ?", [req.session.userId]);
  const myRank = dbGet("SELECT COUNT(*) as rank FROM progress WHERE total_points > ?", [myRow?.total_points || 0]);

  res.json({
    leaderboard: rows,
    myRank: (myRank?.rank || 0) + 1,
    myPoints: myRow?.total_points || 0
  });
});

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
app.post("/generate", requireAuth, upload.array("pyqs", 5), async (req, res) => {
  try {
    const { university, subject, semester, format, hours, weakTopics } = req.body;
    console.log("FORMAT RECEIVED:", JSON.stringify(format));
    const files = req.files || [];
    const isEmergency = parseInt(hours) <= 3;
    const scheduleCount = Math.min(parseInt(hours) || 6, 6);

    let pyqText = "";
    for (const file of files) {
      const text = await extractPdfText(file.path);
      pyqText += text.slice(0, 200);
      fs.unlink(file.path, () => {});
    }

    const prompt1 = `Expert exam analyst. Indian engineering university.
University: ${university} | Subject: ${subject} | Sem: ${semester} | Format: ${format} | Hours: ${hours} | Weak: ${weakTopics || "None"}
${pyqText ? "PYQ hint: " + pyqText : ""}

Respond ONLY valid JSON no markdown:
{
  "universityDNA": "2 sentences on exam style",
  "emergencyMode": ${isEmergency},
  "topicFrequency": [{"topic":"T","appearances":3,"lastYear":2023,"avgMarks":8}],
  "topics": [{
    "name":"Topic","priority":"MUST DO","confidence":85,"expectedMarks":16,"hoursNeeded":2,"reason":"short reason",
    "cheatSheet":{"definition":"def","keyPoints":["p1","p2","p3"],"formulas":["f1"],"diagram":"draw this","examTip":"tip"},
    "selfTest":{"twoMark":["Q1"],"eightMark":["Q1"],"sixteenMark":["Q1"]}
  }],
  "schedule":[{"hour":1,"task":"task","topic":"topic","type":"study"}]
}
Rules: 4 topics, 3 topicFrequency, ${scheduleCount} schedule items. Be concise.
Format-specific: ${format === 'Numerical Heavy' ? 'prioritise numerical problem topics, mark formula-heavy topics as MUST DO' : format === 'Pure Theory' ? 'prioritise definition and theory topics, deprioritise numerical topics' : format === 'MCQ Based' ? 'prioritise broad coverage topics over deep-dive topics since MCQ tests wide knowledge' : 'balanced mix of theory and numerical topics'}.
University-specific: tailor topic priorities to how ${university} actually sets ${subject} papers in ${semester}.`;

    const raw1 = await callGroqWithRetry([{ role: "user", content: prompt1 }], 0.6, 1200);
    let battlePlan;
    try { battlePlan = cleanJson(raw1); }
    catch (e) {
      console.error("JSON parse failed:", e.message);
      return res.status(500).json({ error: "AI response parsing failed. Try again." });
    }

    await sleep(1500);

    const isMCQ       = format === 'MCQ Based';
    const isNumerical = format === 'Numerical Heavy';
    const isTheory    = format === 'Pure Theory';
    const isMixed     = format === 'Mixed Format';

    const promptA = `You are an exam paper setter. Generate Section A for ${subject}, ${semester}, ${university}.
EXAM FORMAT IS: ${format}
${isMCQ       ? 'STRICT RULE: Every single question in sectionA MUST be MCQ format. Each question must have exactly 4 options labeled (a), (b), (c), (d). The answer field must say which option is correct and why. NO descriptive questions allowed.' : ''}
${isNumerical ? 'STRICT RULE: At least 4 out of 5 questions must be numerical problems. Show full calculation in answer field. Include given data, formula, substitution, final answer with units.' : ''}
${isTheory    ? 'STRICT RULE: All questions must be pure theory — definitions, full forms, state theorems, differentiate between concepts. Zero numericals allowed.' : ''}
${isMixed     ? 'STRICT RULE: Mix of 3 theory questions and 2 numerical questions.' : ''}
Respond ONLY valid JSON no markdown:
{"sectionA":[{"qNo":1,"question":"full question text${isMCQ ? ' with (a)(b)(c)(d) options written inside the question field' : ''}","marks":2,"topic":"topic name","answer":"${isMCQ ? 'Correct option is (X) because...' : 'model answer'}"}]}
Exactly 5 questions. Cover high-frequency topics for ${university} ${subject} ${semester}.`;

    const rawA = await callGroqWithRetry([{ role: "user", content: promptA }], 0.5, 900);
    let sectionA = [];
    try { sectionA = cleanJson(rawA).sectionA || []; } catch (e) { console.error("SectionA fail:", e.message); }

    await sleep(1500);

    const promptBC = `You are an exam paper setter. Generate Section B and Section C for ${subject}, ${semester}, ${university}.
EXAM FORMAT IS: ${format}
${isMCQ       ? 'STRICT RULE: Section B and C are descriptive even in MCQ-format exams. But all questions must test conceptual knowledge MCQ exams focus on — short definitions, differences, state-and-explain type. No lengthy derivations.' : ''}
${isNumerical ? 'STRICT RULE: Section B must have 2 numerical problems and 1 theory. Section C must have 1 full numerical derivation and 1 numerical problem. Every numerical must show: Given → Find → Formula → Step-by-step working → Final answer with units.' : ''}
${isTheory    ? 'STRICT RULE: All questions must be pure theory. Explain, describe, differentiate, justify. Zero numericals. Diagrams encouraged — describe them in the diagram field.' : ''}
${isMixed     ? 'STRICT RULE: Section B: 2 theory + 1 numerical. Section C: 1 theory with diagram + 1 numerical with full working.' : ''}
Respond ONLY valid JSON no markdown:
{
  "sectionB":[{"qNo":1,"question":"full question","marks":8,"topic":"topic","answer":"detailed answer","diagram":"","numerical":""}],
  "sectionC":[{"qNo":1,"question":"full question","marks":16,"topic":"topic","answer":"comprehensive answer","diagram":"","numerical":""}]
}
sectionB exactly 3 questions. sectionC exactly 2 questions.`;

    const rawBC = await callGroqWithRetry([{ role: "user", content: promptBC }], 0.5, 1200);
    let sectionB = [], sectionC = [];
    try {
      const parsed = cleanJson(rawBC);
      sectionB = parsed.sectionB || [];
      sectionC = parsed.sectionC || [];
    } catch (e) { console.error("SectionBC fail:", e.message); }

    battlePlan.predictedPaper = {
      title: `${subject} — Predicted Question Paper (${university})`,
      sectionA, sectionB, sectionC,
    };

    res.json({ success: true, data: battlePlan });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
});

// ─── ROUTE 2: POST /youtube ──────────────────────────────────────────────────
app.post("/youtube", requireAuth, async (req, res) => {
  try {
    const { topics, subject, university } = req.body;
    const subjectLower = (subject || "").toLowerCase();

    let channelHint = "NPTEL";
    if (/data struct|algorithm|os|operating|network|compiler|dbms|software eng/.test(subjectLower))
      channelHint = "Gate Smashers";
    else if (/electron|circuit|signal|analog|digital|vlsi|microprocess/.test(subjectLower))
      channelHint = "Neso Academy";
    else if (/math|calculus|algebra|statistics|probability|discrete/.test(subjectLower))
      channelHint = "Khan Academy";
    else if (/physics|quantum|optics|electromagnet/.test(subjectLower))
      channelHint = "Physics Wallah";
    else if (/python|java|web|programming|coding/.test(subjectLower))
      channelHint = "CodeWithHarry";

    const topicList = Array.isArray(topics) ? topics.slice(0, 6) : [{ name: topics, task: "" }];
    const results = {};

    for (const t of topicList) {
      const topicName = typeof t === "object" ? (t.name || "") : t;
      const taskDesc  = typeof t === "object" ? (t.task  || "") : "";
      if (!topicName) continue;

      const combined = taskDesc && taskDesc.toLowerCase() !== topicName.toLowerCase()
        ? `${topicName} ${taskDesc}` : topicName;
      const query = `${combined} ${subject} ${channelHint}`;

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${process.env.YOUTUBE_API_KEY}`;
      const ytRes  = await fetch(url);
      const ytData = await ytRes.json();

      const allVids = (ytData.items || []).map((item) => ({
        videoId:   item.id.videoId,
        title:     item.snippet.title,
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        watchUrl:  `https://www.youtube.com/watch?v=${item.id.videoId}`,
        href:      `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

      const topicWords = topicName.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const matched = allVids.filter(v => topicWords.some(w => v.title.toLowerCase().includes(w)));
      results[topicName] = (matched.length ? matched : allVids).slice(0, 2);
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("YouTube error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE 3: POST /bhaiya ────────────────────────────────────────────────────
app.post("/bhaiya", requireAuth, async (req, res) => {
  try {
    const { question, subject, university, history = [] } = req.body;
    const systemPrompt = `You are Senior Bhaiya — a friendly, brilliant final-year Indian engineering student at ${university || "your university"}.
Speak casually, mix Hindi (yaar, bhai, dekh, chill maar). Give shortcuts, memory tricks, exam tips. Be specific to ${subject || "the subject"}.
Keep under 120 words. Always actionable.`;

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
app.post("/grade", requireAuth, async (req, res) => {
  try {
    const { question, answer, maxMarks, subject } = req.body;
    const prompt = `Indian university examiner grading ${subject}.
QUESTION: ${question}
MAX MARKS: ${maxMarks}
STUDENT ANSWER: ${answer}
Respond ONLY valid JSON no markdown:
{"scored":<number>,"maxMarks":${maxMarks},"modelAnswer":"ideal answer in 3 sentences","missed":"what student missed","tip":"one improvement tip"}`;

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
app.post("/teach", requireAuth, async (req, res) => {
  try {
    const { topic, task, subject, university, hours } = req.body;
    const prompt = `Expert Indian engineering teacher. Student has ${hours}h left for ${subject} exam at ${university}. Teach "${topic}" fast.
Respond ONLY valid JSON no markdown:
{
  "hook": "One punchy sentence — what this topic is in plain English",
  "coreConcept": "Core concept in 3-4 sentences. Simple language.",
  "keyPoints": ["Examiner wants this — point 1", "Point 2", "Point 3", "Point 4"],
  "formula": "Key formula or algorithm. Empty string if none.",
  "diagramSteps": "How to draw the key diagram step by step. Empty string if none.",
  "memoryTrick": "One clever trick or acronym to remember this",
  "examWarning": "Biggest mistake students make and how to avoid it",
  "quickQuiz": "One likely 2-mark question with 2-sentence model answer"
}`;

    const raw = await callGroqWithRetry([{ role: "user", content: prompt }], 0.7, 800);
    let lesson;
    try { lesson = cleanJson(raw); }
    catch (e) { return res.status(500).json({ error: "Lesson parse failed. Try again." }); }

    let ytVideos = [];
    try {
      const subjectLower = (subject || "").toLowerCase();
      let channelHint = "NPTEL";
      if (/data struct|algorithm|os|operating|network|compiler|dbms|database|software/.test(subjectLower))
        channelHint = "Gate Smashers";
      else if (/electron|circuit|signal|analog|digital|vlsi|microprocess/.test(subjectLower))
        channelHint = "Neso Academy";
      else if (/math|calculus|algebra|statistics|probability|discrete/.test(subjectLower))
        channelHint = "Khan Academy";
      else if (/physics|quantum|optics|electromagnet/.test(subjectLower))
        channelHint = "Physics Wallah";
      else if (/python|java|web|android|programming|coding/.test(subjectLower))
        channelHint = "CodeWithHarry";

      const topicClean = topic.trim();
      const taskClean  = (task || "").trim();
      const combined   = taskClean && taskClean.toLowerCase() !== topicClean.toLowerCase()
        ? `${topicClean} ${taskClean}` : topicClean;

      const query = `${combined} ${subject} ${channelHint}`;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`;
      const ytRes = await fetch(url);
      const ytData = await ytRes.json();

      const topicWords = topicClean.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const allVideos  = (ytData.items || []).map((item) => ({
        title:   item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb:   item.snippet.thumbnails.medium.url,
        href:    `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

      const matched = allVideos.filter(v => topicWords.some(w => v.title.toLowerCase().includes(w)));
      ytVideos = (matched.length ? matched : allVideos).slice(0, 2);
    } catch (ytErr) {
      console.error("YT fetch in /teach:", ytErr.message);
    }

    res.json({ success: true, data: lesson, ytVideos });
  } catch (err) {
    console.error("Teach error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`⚔️  COLOSSEUM running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("DB init failed:", err);
  process.exit(1);
});