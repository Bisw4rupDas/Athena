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
// Demo cache — if ?demo=true, return instant pre-built plan
const DEMO_PLAN = {
  universityDNA: "MAKAUT follows a highly predictable pattern — same 6-8 topics repeat every year with slight rephrasing. Definition + diagram + 2 points = full marks. Examiner rewards structure over depth.",
  emergencyMode: false,
  topicFrequency: [
    { topic: "Process Scheduling", appearances: 5, lastYear: 2024, avgMarks: 16 },
    { topic: "Deadlock", appearances: 5, lastYear: 2024, avgMarks: 16 },
    { topic: "Memory Management", appearances: 4, lastYear: 2023, avgMarks: 16 },
    { topic: "File Systems", appearances: 3, lastYear: 2023, avgMarks: 8 }
  ],
  topics: [
    {
      name: "Process Scheduling",
      priority: "MUST DO",
      confidence: 95,
      expectedMarks: 16,
      hoursNeeded: 2,
      reason: "Appears every year — FCFS, SJF, Round Robin guaranteed",
      cheatSheet: {
        definition: "CPU scheduling determines which process runs next using algorithms like FCFS, SJF, Priority, and Round Robin.",
        keyPoints: ["FCFS: non-preemptive, convoy effect", "SJF: minimum average waiting time", "Round Robin: time quantum, fairness"],
        formulas: ["Turnaround Time = Completion - Arrival", "Waiting Time = TAT - Burst Time"],
        diagram: "Gantt chart showing process execution timeline",
        examTip: "Always draw the Gantt chart — it gets you 4 marks automatically"
      },
      selfTest: { twoMark: ["Define scheduling?", "What is convoy effect?"], eightMark: ["Compare FCFS and SJF"], sixteenMark: ["Explain all CPU scheduling algorithms with examples"] }
    },
    {
      name: "Deadlock",
      priority: "MUST DO",
      confidence: 92,
      expectedMarks: 16,
      hoursNeeded: 2,
      reason: "4 conditions + Banker's Algorithm = 16 marks, appears every semester",
      cheatSheet: {
        definition: "Deadlock is a situation where processes wait for each other in a circular chain, none can proceed.",
        keyPoints: ["4 conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait", "Prevention: negate one condition", "Banker's Algorithm for avoidance"],
        formulas: ["Safety Algorithm: Need = Max - Allocation"],
        diagram: "Resource allocation graph showing circular wait",
        examTip: "Memorize the 4 conditions as MHNC — examiners always ask for all 4"
      },
      selfTest: { twoMark: ["What is deadlock?", "State 4 conditions"], eightMark: ["Explain Banker's Algorithm"], sixteenMark: ["Deadlock detection, prevention, avoidance with examples"] }
    },
    {
      name: "Memory Management",
      priority: "HIGH",
      confidence: 85,
      expectedMarks: 16,
      hoursNeeded: 2,
      reason: "Paging and segmentation asked almost every year",
      cheatSheet: {
        definition: "Memory management handles allocation of RAM to processes using techniques like paging, segmentation, and virtual memory.",
        keyPoints: ["Paging: fixed size frames, no external fragmentation", "Segmentation: variable size, logical view", "Page replacement: FIFO, LRU, Optimal"],
        formulas: ["Physical Address = Frame No × Frame Size + Offset"],
        diagram: "Page table mapping logical to physical address",
        examTip: "Draw the page table for every memory question — guaranteed marks"
      },
      selfTest: { twoMark: ["What is paging?", "Define thrashing"], eightMark: ["Explain page replacement algorithms"], sixteenMark: ["Virtual memory and demand paging with diagrams"] }
    }
  ],
  schedule: [
    { hour: 1, task: "Process Scheduling — FCFS, SJF, Round Robin with Gantt charts", topic: "Process Scheduling", type: "study" },
    { hour: 2, task: "Deadlock — 4 conditions + Banker's Algorithm numerical", topic: "Deadlock", type: "study" },
    { hour: 3, task: "Quick break — review notes so far", topic: "", type: "break" },
    { hour: 4, task: "Memory Management — Paging, Segmentation, Page Replacement", topic: "Memory Management", type: "study" },
    { hour: 5, task: "File Systems — FAT, Inode, Disk Scheduling", topic: "File Systems", type: "study" },
    { hour: 6, task: "Self Exam — attempt predicted paper under timed conditions", topic: "All Topics", type: "study" }
  ],
  predictedPaper: {
    title: "Operating Systems — Predicted Paper (MAKAUT)",
    sectionA: [
      { qNo: 1, question: "Define process scheduling and list its objectives.", marks: 2, topic: "Process Scheduling", answer: "Process scheduling selects which process runs on CPU next. Objectives: maximize CPU utilization, minimize waiting time, ensure fairness." },
      { qNo: 2, question: "What is the convoy effect in FCFS scheduling?", marks: 2, topic: "Process Scheduling", answer: "Convoy effect occurs when short processes wait behind a long process in FCFS, causing high average waiting time." },
      { qNo: 3, question: "State the four necessary conditions for deadlock.", marks: 2, topic: "Deadlock", answer: "Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait must all hold simultaneously for deadlock to occur." },
      { qNo: 4, question: "What is thrashing in memory management?", marks: 2, topic: "Memory Management", answer: "Thrashing occurs when a process spends more time paging than executing, causing severe performance degradation." },
      { qNo: 5, question: "Define paging and explain its advantage.", marks: 2, topic: "Memory Management", answer: "Paging divides memory into fixed-size frames eliminating external fragmentation, making memory allocation efficient." }
    ],
    sectionB: [
      { qNo: 1, question: "Explain Round Robin scheduling with an example. Given processes P1(bt=4), P2(bt=3), P3(bt=5) with time quantum=2, draw the Gantt chart.", marks: 8, topic: "Process Scheduling", answer: "Round Robin assigns CPU to each process for a fixed time quantum in circular order. With quantum=2: P1 runs 0-2, P2 runs 2-4, P3 runs 4-6, P1 runs 6-8, P2 runs 8-9, P3 runs 9-11, P3 runs 11-12. Average waiting time = (4+3+6)/3 = 4.33ms. It ensures fairness and is ideal for time-sharing systems.", diagram: "Gantt chart: |P1|P2|P3|P1|P2|P3|P3| with timestamps 0,2,4,6,8,9,11,12", numerical: "" },
      { qNo: 2, question: "Explain Banker's Algorithm for deadlock avoidance with an example.", marks: 8, topic: "Deadlock", answer: "Banker's Algorithm checks if granting a resource request keeps the system in a safe state. Need matrix = Max - Allocation. Find a process whose Need ≤ Available, allocate, release, repeat. If all processes finish, state is safe. It prevents deadlock by never entering unsafe states.", diagram: "Table showing Allocation, Max, Need, Available matrices", numerical: "Given 3 processes, Available=[3,3,2]: Check P1 Need=[7,4,3]>Available, try P2 Need=[1,2,2]≤Available, safe sequence: P2,P4,P1,P3,P0" }
    ],
    sectionC: [
      { qNo: 1, question: "Explain all CPU scheduling algorithms with diagrams, advantages, disadvantages and numerical examples.", marks: 16, topic: "Process Scheduling", answer: "CPU scheduling algorithms include: (1) FCFS — processes served in arrival order, simple but convoy effect causes high waiting time. (2) SJF — shortest job first, optimal average waiting time but requires future burst time knowledge. (3) Priority Scheduling — highest priority runs first, risk of starvation solved by aging. (4) Round Robin — time quantum based, fair for time-sharing, context switch overhead. Each algorithm trades off between fairness, throughput, and response time. Draw Gantt charts for all with the same process set to compare performance.", diagram: "Gantt charts for all 4 algorithms with same input: P1(6ms), P2(8ms), P3(7ms), P4(3ms)", numerical: "FCFS WT=(0+6+14+21)/4=10.25ms, SJF WT=(0+3+9+16)/4=7ms" },
      { qNo: 2, question: "Describe virtual memory and demand paging with page replacement algorithms (FIFO, LRU, Optimal) with examples.", marks: 16, topic: "Memory Management", answer: "Virtual memory allows processes to use more memory than physically available by storing pages on disk. Demand paging loads pages only when accessed, triggering page faults. Page replacement algorithms decide which page to evict: FIFO removes oldest page (suffers Belady's anomaly), LRU removes least recently used (best practical performance), Optimal removes page used furthest in future (theoretical best). For reference string 7,0,1,2,0,3,0,4: FIFO gives 8 faults, LRU gives 8 faults, Optimal gives 6 faults. Thrashing occurs when working set exceeds frames causing constant page faults.", diagram: "Page table showing frame allocation and page fault sequence for each algorithm", numerical: "Reference string: 1,2,3,4,1,2,5,1,2,3,4,5 with 4 frames — show FIFO page faults step by step" }
    ]
  }
};

app.post("/generate", upload.array("pyqs", 5), async (req, res) => {
  try {
    const { university, subject, semester, format, hours, weakTopics } = req.body;
    const isEmergency = parseInt(hours) <= 3;

    // ── DEMO MODE — instant response for stage presentation ──
    if (req.query.demo === "true") {
      console.log("🎭 DEMO MODE — returning cached plan");
      await new Promise(r => setTimeout(r, 2000)); // fake 2s "thinking"
      return res.json({ success: true, data: DEMO_PLAN });
    }

    const files = req.files || [];

    // Extract PDF text
    let pyqText = "";
    for (const file of files) {
      const text = await extractPdfText(file.path);
      pyqText += `\n--- ${file.originalname} ---\n${text.slice(0, 300)}`;
      fs.unlink(file.path, () => {});
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Auto-retry on rate limit
    async function callWithRetry(messages, temp, maxTokens, attempt = 0) {
      try {
        return await callGroq(messages, temp, maxTokens);
      } catch (e) {
        if (attempt < 4 && e.message && e.message.includes("Rate limit")) {
          const wait = (attempt + 1) * 8000; // 8s, 16s, 24s, 32s
          console.log(`Rate limited, retrying in ${wait/1000}s (attempt ${attempt + 1})...`);
          await sleep(wait);
          return callWithRetry(messages, temp, maxTokens, attempt + 1);
        }
        throw e;
      }
    }

    // ── Call 1: Topics + Schedule ──────────────────────────────
    const prompt1 = `You are an expert AI exam analyst for Indian engineering universities.
University: ${university}, Subject: ${subject}, Semester: ${semester}, Format: ${format}, Hours: ${hours}
Weak Topics: ${weakTopics || "None"}
PYQ snippet: ${pyqText.slice(0, 300) || "None uploaded"}

Respond ONLY with valid JSON, no markdown, no trailing commas:
{
  "universityDNA": "2 sentences about this university exam style",
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
      "reason": "One sentence",
      "cheatSheet": {
        "definition": "One sentence",
        "keyPoints": ["Point 1", "Point 2", "Point 3"],
        "formulas": ["Formula 1"],
        "diagram": "What to draw",
        "examTip": "One tip"
      },
      "selfTest": {
        "twoMark": ["Q1", "Q2"],
        "eightMark": ["Q1"],
        "sixteenMark": ["Q1"]
      }
    }
  ],
  "schedule": [
    {"hour": 1, "task": "Task", "topic": "Topic", "type": "study"}
  ]
}
Rules: EXACTLY 4 topics, EXACTLY ${Math.min(parseInt(hours)||6, 6)} schedule items. Under 2000 tokens.`;

    console.log("⚡ Call 1: Topics + Schedule...");
    const raw1 = await callWithRetry([{ role: "user", content: prompt1 }], 0.6, 2000);
    let battlePlan;
    try { battlePlan = cleanJson(raw1); }
    catch (e) { return res.status(500).json({ error: "Analysis failed. Please try again." }); }

    // ── Call 2: Section A + B ──────────────────────────────────
    const prompt2 = `You are an exam paper setter for ${subject} at ${university}.
Respond ONLY with valid JSON, no markdown:
{
  "sectionA": [
    {"qNo": 1, "question": "Question", "marks": 2, "topic": "Topic", "answer": "2-3 sentence model answer"}
  ],
  "sectionB": [
    {"qNo": 1, "question": "Question", "marks": 8, "topic": "Topic", "answer": "4-5 sentence answer", "diagram": "diagram description or empty string", "numerical": "working or empty string"}
  ]
}
Rules: EXACTLY 5 sectionA, EXACTLY 3 sectionB. Under 2000 tokens.`;

    console.log("⚡ Call 2: Section A + B...");
    const raw2 = await callWithRetry([{ role: "user", content: prompt2 }], 0.6, 2000);
    let part2 = { sectionA: [], sectionB: [] };
    try { part2 = cleanJson(raw2); } catch (e) { console.error("Part2 parse fail:", e.message); }

    // ── Call 3: Section C ──────────────────────────────────────
    const prompt3 = `You are an exam paper setter for ${subject} at ${university}.
Respond ONLY with valid JSON, no markdown:
{
  "sectionC": [
    {"qNo": 1, "question": "Question", "marks": 16, "topic": "Topic", "answer": "6-8 sentence comprehensive answer", "diagram": "diagram description or empty string", "numerical": "working or empty string"}
  ]
}
Rules: EXACTLY 3 sectionC questions. Under 1500 tokens.`;

    console.log("⚡ Call 3: Section C...");
    const raw3 = await callWithRetry([{ role: "user", content: prompt3 }], 0.6, 1500);
    let part3 = { sectionC: [] };
    try { part3 = cleanJson(raw3); } catch (e) { console.error("Part3 parse fail:", e.message); }

    battlePlan.predictedPaper = {
      title: `${subject} — Predicted Paper (${university})`,
      sectionA: part2.sectionA || [],
      sectionB: part2.sectionB || [],
      sectionC: part3.sectionC || [],
    };

    console.log("✅ Battle plan ready!");
    res.json({ success: true, data: battlePlan });

  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
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
