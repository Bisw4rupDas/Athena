// ═══════════════════════════════════════════════════════════
// COLOSSEUM — FRONTEND LOGIC
// ═══════════════════════════════════════════════════════════

// ─── Global State ─────────────────────────────────────────
let battlePlan = null;
let studentData = {};
let bhaiyaHistory = [];
let examQuestions = [];
let examIndex = 0;
let examScores = [];
let examTimerInterval = null;
let examTimeLeft = 0;
let wrTimerInterval = null;
let wrSeconds = 0;
let wrTopicIndex = 0;
let wrTopicDone = new Set();
let freqChart = null;
let priorityChart = null;

// ─── Points System ─────────────────────────────────────────
let pointsData = JSON.parse(
  localStorage.getItem('colosseum-points') ||
  '{"total":0,"history":[],"stats":{"minsStudied":0,"topicsDone":0,"timesRedeemed":0}}'
);

// Ensure stats object always exists (for old saves)
if (!pointsData.stats) pointsData.stats = { minsStudied: 0, topicsDone: 0, timesRedeemed: 0 };

const BADGES = [
  { id: 'warrior',   name: 'WARRIOR',  icon: '⚔️',  threshold: 100  },
  { id: 'on-fire',   name: 'ON FIRE',  icon: '🔥',  threshold: 500  },
  { id: 'legend',    name: 'LEGEND',   icon: '🏆',  threshold: 2000 },
  { id: 'colossus',  name: 'COLOSSUS', icon: '👑',  threshold: 5000 },
];

const CANTEEN_REWARDS = [
  { id: 'canteen-10', name: '₹10 Canteen Credit', cost: 500,  value: '₹10' },
  { id: 'canteen-25', name: '₹25 Canteen Credit', cost: 1000, value: '₹25' },
  { id: 'canteen-75', name: '₹75 Canteen Credit', cost: 3000, value: '₹75' },
];

function savePoints() {
  localStorage.setItem('colosseum-points', JSON.stringify(pointsData));
}

function addPoints(amount, reason) {
  pointsData.total = Math.max(0, pointsData.total + amount);
  pointsData.history.unshift({ amount, reason, time: Date.now() });
  if (pointsData.history.length > 100) pointsData.history.pop();
  savePoints();
  showPointsToast(amount, reason);
}

function showPointsToast(amount, reason) {
  const existing = document.getElementById('pts-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'pts-toast';
  toast.style.cssText = [
    'position:fixed','bottom:24px','right:16px','z-index:9999',
    'background:#0d1022','border:1px solid #1e3060',
    'border-radius:12px','padding:10px 16px',
    'font-family:var(--font-mono)','font-size:12px',
    'font-weight:700','letter-spacing:0.06em',
    'color:#22c578','box-shadow:0 4px 24px rgba(0,0,0,0.6)',
    'animation:wcFadeIn 0.3s ease'
  ].join(';');
  toast.textContent = '+' + amount + ' PTS — ' + reason;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// Inject toast animation once
(function() {
  const s = document.createElement('style');
  s.textContent = '@keyframes wcFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(s);
})();

function getCurrentRank() {
  const earned = BADGES.filter(b => pointsData.total >= b.threshold);
  return earned.length ? earned[earned.length - 1] : { name: 'ROOKIE', icon: '🎯' };
}

function getNextBadge() {
  return BADGES.find(b => pointsData.total < b.threshold) || null;
}

// ── War Chest Tab state ────────────────────────────────────
let _wcTab = 'all';

function wcSwitchTab(tab, el) {
  _wcTab = tab;
  document.querySelectorAll('.wc-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderWcHistory();
}

// ── Show screen ────────────────────────────────────────────
function showPointsScreen() {
  renderPointsScreen();
  showScreen('screen-points');
}

function renderPointsScreen() {
  const total = pointsData.total;
  const stats = pointsData.stats;
  const rank = getCurrentRank();
  const next = getNextBadge();

  // Hero
  document.getElementById('pts-total').textContent = total.toLocaleString();
  document.getElementById('pts-rank').textContent = rank.icon + ' ' + rank.name;

  // Stats
  document.getElementById('pts-stat-mins').textContent   = stats.minsStudied  || 0;
  document.getElementById('pts-stat-topics').textContent  = stats.topicsDone   || 0;
  document.getElementById('pts-stat-redeemed').textContent = stats.timesRedeemed || 0;

  // Progress bar to next canteen reward
  const nextEl = document.getElementById('pts-next-badge');
  const goal = CANTEEN_REWARDS[0].cost;
  const pct  = Math.min(Math.round((total / goal) * 100), 100);
  const need = Math.max(0, goal - total);
  nextEl.innerHTML =
    '<div class="wc-prog-track"><div class="wc-prog-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="wc-prog-label">' + (need > 0 ? need.toLocaleString() + ' PTS TO CANTEEN REWARD' : '✓ READY TO REDEEM') + '</div>';

  // History
  renderWcHistory();

  // Rewards
  const rewardIcons = { 'canteen-10': '🍔', 'canteen-25': '🧋', 'canteen-75': '🎯' };
  document.getElementById('pts-rewards').innerHTML = CANTEEN_REWARDS.map(function(r) {
    const canAfford = total >= r.cost;
    const need2 = r.cost - total;
    return '<div class="wc-reward-card' + (canAfford ? '' : ' locked') + '">' +
      '<div class="wc-reward-icon">' + (rewardIcons[r.id] || '🏪') + '</div>' +
      '<div class="wc-reward-body">' +
        '<div class="wc-reward-name">' + r.name + '</div>' +
        '<div class="wc-reward-cost">' + r.cost.toLocaleString() + ' PTS' +
          (canAfford ? '' : ' · need ' + need2.toLocaleString() + ' more') +
        '</div>' +
      '</div>' +
      '<button class="wc-reward-action" ' +
        (canAfford ? 'onclick="redeemReward(\'' + r.id + '\',' + r.cost + ',\'' + r.value + '\')"' : 'disabled') + '>' +
        (canAfford ? 'REDEEM' : 'LOCKED') +
      '</button>' +
    '</div>';
  }).join('');

  // Badges
  document.getElementById('pts-badges').innerHTML = BADGES.map(function(b) {
    const earned = total >= b.threshold;
    return '<div class="wc-badge' + (earned ? ' earned' : ' locked') + '">' +
      '<div class="wc-badge-icon">' + b.icon + '</div>' +
      '<div class="wc-badge-name">' + b.name + '</div>' +
      '<div class="wc-badge-pts">' + b.threshold.toLocaleString() + ' pts</div>' +
    '</div>';
  }).join('');
}

function renderWcHistory() {
  const list = pointsData.history.filter(function(h) {
    if (_wcTab === 'earned') return h.amount > 0;
    if (_wcTab === 'spent')  return h.amount < 0;
    return true;
  }).slice(0, 25);

  const histEl = document.getElementById('pts-history');
  if (!histEl) return;

  if (!list.length) {
    histEl.innerHTML = '<div class="wc-empty">No activity yet. Start studying!</div>';
    return;
  }

  histEl.innerHTML = list.map(function(h) {
    const mins = Math.round((Date.now() - h.time) / 60000);
    const timeStr = mins < 2
      ? 'Just now'
      : mins < 60
      ? mins + ' mins ago'
      : mins < 1440
      ? Math.round(mins / 60) + ' hours ago'
      : Math.round(mins / 1440) + ' days ago';
    const isSpend = h.amount < 0;

    // Pick icon based on reason content
    let icon = '⏱';
    if (h.reason && h.reason.includes('War Room')) icon = '⚔️';
    else if (h.reason && h.reason.includes('Exam')) icon = '📝';
    else if (h.reason && h.reason.includes('canteen')) icon = '🏪';

    return '<div class="wc-hist-item">' +
      '<div class="wc-hist-icon ' + (isSpend ? 'spend' : 'earn') + '">' + icon + '</div>' +
      '<div class="wc-hist-info">' +
        '<div class="wc-hist-action">' + h.reason + '</div>' +
        '<div class="wc-hist-time">' + timeStr + '</div>' +
      '</div>' +
      '<div class="wc-hist-pts ' + (isSpend ? 'spend' : 'earn') + '">' +
        (isSpend ? '' : '+') + h.amount +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Redeem QR ──────────────────────────────────────────────
let _qrCountdown = null;

function redeemReward(id, cost, value) {
  if (pointsData.total < cost) return;
  pointsData.total -= cost;
  pointsData.stats.timesRedeemed = (pointsData.stats.timesRedeemed || 0) + 1;
  pointsData.history.unshift({ amount: -cost, reason: 'Redeemed ' + value + ' canteen credit', time: Date.now() });
  savePoints();

  const code = 'CLM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  document.getElementById('qr-code-val').textContent = code;
  document.getElementById('qr-value-label').textContent = value + ' OFF YOUR ORDER';
  document.getElementById('pts-qr-modal').classList.remove('hidden');

  let secs = 600;
  clearInterval(_qrCountdown);
  _qrCountdown = setInterval(function() {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    document.getElementById('qr-timer').textContent = m + ':' + s;
    if (secs <= 0) {
      clearInterval(_qrCountdown);
      document.getElementById('pts-qr-modal').classList.add('hidden');
    }
  }, 1000);

  renderPointsScreen();
}

// ─── Screen Management ────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  window.scrollTo(0, 0);
}

function goHome() {
  battlePlan = null;
  studentData = {};
  bhaiyaHistory = [];
  examQuestions = [];
  clearExamTimer();
  clearWrTimer();
  showScreen('screen-form');
}

// ─── Hours Slider ─────────────────────────────────────────
const slider = document.getElementById('f-hours');
const hoursDisplay = document.getElementById('hours-display');
const modeBadge = document.getElementById('mode-badge');

slider.addEventListener('input', function() {
  const h = parseInt(slider.value);
  hoursDisplay.textContent = h + ' HOUR' + (h !== 1 ? 'S' : '');
  modeBadge.className = 'mode-badge';
  if (h <= 3)       { modeBadge.textContent = '🚨 EMERGENCY'; modeBadge.classList.add('emergency'); }
  else if (h <= 8)  { modeBadge.textContent = '⚡ FOCUSED';   modeBadge.classList.add('focused'); }
  else if (h <= 15) { modeBadge.textContent = '🎯 FULL PREP'; modeBadge.classList.add('full'); }
  else              { modeBadge.textContent = '⭐ ACE MODE';  modeBadge.classList.add('ace'); }
});
slider.dispatchEvent(new Event('input'));

// ─── File Upload ──────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput  = document.getElementById('f-pyqs');
const fileListEl = document.getElementById('file-list');
let selectedFiles = [];

uploadZone.addEventListener('click', function() { fileInput.click(); });
fileInput.addEventListener('change', function() { handleFiles(Array.from(fileInput.files)); });
uploadZone.addEventListener('dragover', function(e) { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', function() { uploadZone.classList.remove('dragover'); });
uploadZone.addEventListener('drop', function(e) {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files).filter(function(f) { return f.type === 'application/pdf'; }));
});

function handleFiles(files) {
  files.forEach(function(f) {
    if (selectedFiles.length < 5 && !selectedFiles.find(function(x) { return x.name === f.name; })) {
      selectedFiles.push(f);
    }
  });
  renderFileList();
}

function renderFileList() {
  fileListEl.innerHTML = selectedFiles.map(function(f, i) {
    return '<div class="file-item"><span>📄 ' + f.name + '</span><span class="file-remove" onclick="removeFile(' + i + ')">×</span></div>';
  }).join('');
}

function removeFile(i) { selectedFiles.splice(i, 1); renderFileList(); }

// ─── Generate Battle Plan ─────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', generateBattlePlan);

async function generateBattlePlan() {
  const university = document.getElementById('f-university').value.trim();
  const subject    = document.getElementById('f-subject').value.trim();
  const semester   = document.getElementById('f-semester').value;
  const format     = document.getElementById('f-format').value;
  const hours      = slider.value;
  const weakTopics = document.getElementById('f-weak').value.trim();

  if (!university || !subject || !semester || !format) {
    alert('Please fill in all required fields.');
    return;
  }

  studentData = { university, subject, semester, format, hours, weakTopics };
  showScreen('screen-loading');

  const isEmergency = parseInt(hours) <= 3;
  if (isEmergency) {
    document.getElementById('loading-title').textContent = '🚨 EMERGENCY PROTOCOL ACTIVE';
    document.getElementById('loading-title').classList.add('emergency');
  }

  const msgs = isEmergency
    ? ['Scanning critical topics...', 'Building survival strategy...', 'Cutting everything non-essential...', 'Emergency plan locked in...']
    : ['Extracting question paper text...', 'Detecting cross-year patterns...', 'Building topic priority table...',
       'Generating Section A questions & answers...', 'Waiting for AI quota reset... (~4 mins total, please don\'t close)',
       'Still working... generating Section B questions + diagrams...', 'Still working... generating Section C long answers...',
       'Almost done — finalising your battle plan...'];

  let pct = 0, msgIdx = 0;
  const barEl = document.getElementById('loading-bar');
  const pctEl = document.getElementById('loading-pct');
  const msgEl = document.getElementById('loading-msg');

  const ticker = setInterval(function() {
    pct = Math.min(pct + Math.random() * 12, 92);
    barEl.style.width = pct + '%';
    pctEl.textContent = Math.floor(pct) + '%';
    msgEl.textContent = msgs[msgIdx % msgs.length];
    msgIdx++;
  }, 800);

  try {
    const fd = new FormData();
    fd.append('university', university);
    fd.append('subject', subject);
    fd.append('semester', semester);
    fd.append('format', format);
    fd.append('hours', hours);
    fd.append('weakTopics', weakTopics);
    selectedFiles.forEach(function(f) { fd.append('pyqs', f); });

    const demoMode = new URLSearchParams(window.location.search).get('demo') === 'true';
    const res  = await fetch('/generate' + (demoMode ? '?demo=true' : ''), { method: 'POST', body: fd });
    const json = await res.json();

    clearInterval(ticker);
    if (!json.success) throw new Error(json.error || 'Generation failed');

    barEl.style.width = '100%';
    pctEl.textContent = '100%';
    msgEl.textContent = 'Battle plan ready.';

    battlePlan = json.data;
    await new Promise(function(r) { setTimeout(r, 600); });

    renderBattlePlan();
    showScreen('screen-plan');
    loadYoutube();
  } catch(err) {
    clearInterval(ticker);
    alert('Error: ' + err.message + '\n\nCheck that your API keys are correct in .env');
    showScreen('screen-form');
  }
}

// ─── Render Battle Plan ───────────────────────────────────
function renderBattlePlan() {
  const bp = battlePlan;

  if (bp.emergencyMode) document.getElementById('emergency-banner').classList.remove('hidden');

  document.getElementById('dna-content').innerHTML = '<p>' + bp.universityDNA.replace(/\n/g, '</p><p style="margin-top:12px">') + '</p>';

  renderCharts(bp);

  const tbody = document.getElementById('topics-tbody');
  tbody.innerHTML = (bp.topics || []).map(function(t) {
    const p   = t.priority || 'MEDIUM';
    const cls = p.replace(' ', '-').toLowerCase().includes('must') ? 'priority-must'
      : p.toLowerCase().includes('high')  ? 'priority-high'
      : p.toLowerCase().includes('skip')  ? 'priority-skip'
      : 'priority-medium';
    const conf = t.confidence || 0;
    return '<tr>' +
      '<td><strong>' + t.name + '</strong></td>' +
      '<td><span class="priority-badge ' + cls + '">' + p + '</span></td>' +
      '<td><span style="font-family:var(--font-mono);font-size:12px">' + conf + '%</span>' +
        '<div class="conf-bar"><div class="conf-fill" style="width:' + conf + '%"></div></div></td>' +
      '<td style="font-family:var(--font-mono);font-size:12px;color:var(--green)">' + (t.expectedMarks || '—') + 'm</td>' +
      '<td style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">' + (t.hoursNeeded || '—') + 'h</td>' +
      '<td style="font-size:13px;color:var(--text2)">' + (t.reason || '—') + '</td>' +
    '</tr>';
  }).join('');

  const pp = bp.predictedPaper || {};
  let paperHTML = '<div class="paper-header">' +
    '<div class="paper-title">' + (pp.title || 'Predicted Question Paper') + '</div>' +
    '<div class="paper-sub">AI GENERATED — ' + studentData.university + ' · ' + studentData.subject + ' · ' + studentData.semester + '</div>' +
  '</div>';
  const sections = [
    { key: 'sectionA', label: 'SECTION A — SHORT ANSWER (2 MARKS EACH)' },
    { key: 'sectionB', label: 'SECTION B — MEDIUM ANSWER (8 MARKS EACH)' },
    { key: 'sectionC', label: 'SECTION C — LONG ANSWER (16 MARKS EACH)' },
  ];
  sections.forEach(function(sec) {
    const qs = pp[sec.key] || [];
    if (!qs.length) return;
    paperHTML += '<div class="paper-section"><div class="paper-section-title">' + sec.label + '</div>' +
      qs.map(function(q) {
        return '<div class="paper-question"><div class="paper-qno">Q' + q.qNo + '.</div><div class="paper-qtext">' + q.question + '</div><div class="paper-marks">[' + q.marks + 'M]</div></div>';
      }).join('') + '</div>';
  });
  document.getElementById('predicted-paper').innerHTML = paperHTML;

  const schedule = bp.schedule || [];
  document.getElementById('schedule-content').innerHTML = schedule.map(function(s) {
    const isBreak = (s.type || '').toLowerCase() === 'break';
    const clickAttr = isBreak ? '' : 'onclick="openLesson(' + s.hour + ')" style="cursor:pointer"';
    const cta = isBreak ? '' : '<div class="sched-cta">📚 TAP TO LEARN →</div>';
    const cls = isBreak ? 'sched-break' : 'sched-clickable';
    return '<div class="schedule-item ' + cls + '" id="sched-item-' + s.hour + '" ' + clickAttr + '>' +
      '<div class="sched-hour">HR ' + s.hour + '</div>' +
      '<div class="sched-type">' + (s.type || 'study').toUpperCase() + '</div>' +
      '<div class="sched-task">' + s.task + '</div>' +
      cta +
      '<div class="sched-done-badge hidden" id="sched-done-' + s.hour + '">✓ DONE</div>' +
    '</div>';
  }).join('');

  document.getElementById('cheatsheets-content').innerHTML = (bp.topics || []).filter(function(t) { return t.cheatSheet; }).map(function(t) {
    const cs = t.cheatSheet;
    const keyPts  = Array.isArray(cs.keyPoints) ? cs.keyPoints : [];
    const formulas = Array.isArray(cs.formulas)  ? cs.formulas  : [];
    return '<div class="cheat-card">' +
      '<div class="cheat-topic">' + t.name + '</div>' +
      (cs.definition ? '<div class="cheat-row"><div class="cheat-label">DEFINITION</div><div class="cheat-val">' + cs.definition + '</div></div>' : '') +
      (keyPts.length  ? '<div class="cheat-row"><div class="cheat-label">KEY POINTS</div><ul class="cheat-list">' + keyPts.map(function(p)  { return '<li class="cheat-val">' + p + '</li>'; }).join('') + '</ul></div>' : '') +
      (formulas.length ? '<div class="cheat-row"><div class="cheat-label">FORMULAS</div><ul class="cheat-list">' + formulas.map(function(f) { return '<li class="cheat-val" style="font-family:var(--font-mono);font-size:12px">' + f + '</li>'; }).join('') + '</ul></div>' : '') +
      (cs.diagram  ? '<div class="cheat-row"><div class="cheat-label">DIAGRAM</div><div class="cheat-val">' + cs.diagram + '</div></div>' : '') +
      (cs.examTip  ? '<div class="cheat-tip">💡 ' + cs.examTip + '</div>' : '') +
    '</div>';
  }).join('');

  buildExamQuestions();
}

// ─── Charts ───────────────────────────────────────────────
function renderCharts(bp) {
  const topics = bp.topics || [];
  const freq   = bp.topicFrequency || topics.map(function(t) { return { topic: t.name, appearances: Math.floor(Math.random() * 5) + 1 }; });

  if (freqChart)     { freqChart.destroy();     freqChart     = null; }
  if (priorityChart) { priorityChart.destroy(); priorityChart = null; }

  const chartDefaults = { color: '#A0A0A0', font: { family: "'Space Mono', monospace", size: 11 } };

  freqChart = new Chart(document.getElementById('chart-freq').getContext('2d'), {
    type: 'bar',
    data: {
      labels: freq.slice(0, 8).map(function(f) { return f.topic.length > 16 ? f.topic.slice(0, 14) + '…' : f.topic; }),
      datasets: [{ data: freq.slice(0, 8).map(function(f) { return f.appearances; }), backgroundColor: '#7B5CF5', borderColor: '#9D7FF8', borderWidth: 1 }],
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: chartDefaults, grid: { color: '#1a1a1a' } }, y: { ticks: { ...chartDefaults, stepSize: 1 }, grid: { color: '#1a1a1a' } } } },
  });

  const priorityCounts = { 'MUST DO': 0, 'HIGH': 0, 'MEDIUM': 0, 'SKIP': 0 };
  topics.forEach(function(t) {
    const p = (t.priority || 'MEDIUM').toUpperCase();
    if (p.includes('MUST')) priorityCounts['MUST DO']++;
    else if (p.includes('HIGH')) priorityCounts['HIGH']++;
    else if (p.includes('SKIP')) priorityCounts['SKIP']++;
    else priorityCounts['MEDIUM']++;
  });

  priorityChart = new Chart(document.getElementById('chart-priority').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(priorityCounts),
      datasets: [{ data: Object.values(priorityCounts), backgroundColor: ['#7B5CF5', '#FFD60A', '#555', '#252525'], borderColor: '#080808', borderWidth: 3 }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#A0A0A0', font: { family: "'Space Mono', monospace", size: 10 }, boxWidth: 12 } } } },
  });
}

// ─── YouTube ──────────────────────────────────────────────
async function loadYoutube() {
  try {
    const mustDo = (battlePlan.topics || []).filter(function(t) { return (t.priority || '').toUpperCase().includes('MUST'); }).map(function(t) { return t.name; });
    const topics = mustDo.length ? mustDo : (battlePlan.topics || []).slice(0, 4).map(function(t) { return t.name; });

    const res  = await fetch('/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topics, subject: studentData.subject, university: studentData.university }) });
    const json = await res.json();

    const ytEl = document.getElementById('youtube-content');
    if (!json.success) { ytEl.innerHTML = '<div class="yt-loading">Could not load videos. Check YouTube API key.</div>'; return; }

    ytEl.innerHTML = Object.entries(json.data).map(function([topic, videos]) {
      const cards = videos.length
        ? videos.map(function(v) { return '<div class="yt-card"><img class="yt-thumb" src="' + v.thumbnail + '" alt="' + v.title + '" loading="lazy" /><div class="yt-info"><div class="yt-title">' + v.title + '</div><div class="yt-channel">' + v.channel + '</div><a class="yt-watch" href="' + v.watchUrl + '" target="_blank" rel="noopener">▶ WATCH NOW →</a></div></div>'; }).join('')
        : '<div class="yt-no-result">No videos found for this topic.</div>';
      return '<div class="yt-topic-block"><div class="yt-topic-name">' + topic.toUpperCase() + '</div>' + cards + '</div>';
    }).join('');
  } catch(err) {
    document.getElementById('youtube-content').innerHTML = '<div class="yt-loading">Video load failed: ' + err.message + '</div>';
  }
}

// ─── Senior Bhaiya ────────────────────────────────────────
function quickAsk(q) { document.getElementById('bhaiya-input').value = q; sendBhaiya(); }

async function sendBhaiya() {
  const input    = document.getElementById('bhaiya-input');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';

  const chat = document.getElementById('bhaiya-chat');
  chat.innerHTML += '<div class="bhaiya-msg user"><div class="bhaiya-bubble">' + question + '</div></div>';
  chat.innerHTML += '<div class="bhaiya-msg bot" id="bhaiya-typing"><div class="bhaiya-bubble" style="color:var(--text3)">typing...</div></div>';
  chat.scrollTop = chat.scrollHeight;

  bhaiyaHistory.push({ role: 'user', content: question });

  try {
    const res  = await fetch('/bhaiya', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, subject: studentData.subject, university: studentData.university, history: bhaiyaHistory }) });
    const json = await res.json();
    document.getElementById('bhaiya-typing')?.remove();
    const reply = json.reply || 'Arrey yaar, kuch gadbad ho gayi. Try again!';
    bhaiyaHistory.push({ role: 'assistant', content: reply });
    chat.innerHTML += '<div class="bhaiya-msg bot"><div class="bhaiya-bubble">' + reply.replace(/\n/g, '<br>') + '</div></div>';
    chat.scrollTop = chat.scrollHeight;
  } catch(err) {
    document.getElementById('bhaiya-typing')?.remove();
    chat.innerHTML += '<div class="bhaiya-msg bot"><div class="bhaiya-bubble" style="color:var(--red)">Server error, bhai. Check your connection.</div></div>';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.activeElement.id === 'bhaiya-input') sendBhaiya();
});

// ─── War Room ─────────────────────────────────────────────
function showWarRoom() {
  if (!battlePlan) return;
  const topics = (battlePlan.topics || []).filter(function(t) { return t.cheatSheet; });
  if (!topics.length) { alert('No cheat sheets available.'); return; }

  wrTopicDone = new Set();
  wrTopicIndex = 0;
  clearWrTimer();
  wrSeconds = 0;

  document.getElementById('warroom-checklist').innerHTML = topics.map(function(t, i) {
    return '<div class="wr-check-item ' + (i === 0 ? 'active' : '') + '" id="wrck-' + i + '" onclick="wrSelectTopic(' + i + ')">' +
      '<div class="wr-checkbox" id="wrcb-' + i + '"></div><span>' + t.name + '</span></div>';
  }).join('');

  wrSelectTopic(0);
  updateWrProgress();
  showScreen('screen-warroom');
}

function wrSelectTopic(i) {
  const topics = (battlePlan.topics || []).filter(function(t) { return t.cheatSheet; });
  wrTopicIndex = i;

  document.querySelectorAll('.wr-check-item').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('wrck-' + i)?.classList.add('active');

  const t  = topics[i];
  const cs = t.cheatSheet || {};
  const keyPts  = Array.isArray(cs.keyPoints) ? cs.keyPoints : [];
  const formulas = Array.isArray(cs.formulas)  ? cs.formulas  : [];

  document.getElementById('wr-topic-name').textContent = t.name;
  document.getElementById('wr-cheatsheet').innerHTML =
    (cs.definition ? '<div class="cheat-row"><div class="cheat-label">DEFINITION</div><div class="cheat-val">' + cs.definition + '</div></div>' : '') +
    (keyPts.length  ? '<div class="cheat-row"><div class="cheat-label">KEY POINTS</div><ul class="cheat-list">' + keyPts.map(function(p)  { return '<li class="cheat-val">' + p + '</li>'; }).join('') + '</ul></div>' : '') +
    (formulas.length ? '<div class="cheat-row"><div class="cheat-label">FORMULAS</div><ul class="cheat-list">' + formulas.map(function(f) { return '<li class="cheat-val" style="font-family:var(--font-mono);font-size:12px">' + f + '</li>'; }).join('') + '</ul></div>' : '') +
    (cs.diagram ? '<div class="cheat-row"><div class="cheat-label">DIAGRAM TO DRAW</div><div class="cheat-val">' + cs.diagram + '</div></div>' : '') +
    (cs.examTip ? '<div class="cheat-tip">💡 ' + cs.examTip + '</div>' : '');

  const doneBtn = document.getElementById('wr-done-btn');
  doneBtn.disabled    = wrTopicDone.has(i);
  doneBtn.textContent = wrTopicDone.has(i) ? '✓ COMPLETED' : '✓ MARK DONE & NEXT →';
}

function markDoneAndNext() {
  const topics = (battlePlan.topics || []).filter(function(t) { return t.cheatSheet; });
  wrTopicDone.add(wrTopicIndex);

  // Award points
  pointsData.stats.topicsDone = (pointsData.stats.topicsDone || 0) + 1;
  addPoints(50, 'War Room — Completed "' + topics[wrTopicIndex].name + '"');

  const cb = document.getElementById('wrcb-' + wrTopicIndex);
  if (cb) cb.textContent = '✓';
  document.getElementById('wrck-' + wrTopicIndex)?.classList.add('done');

  updateWrProgress();

  const next = topics.findIndex(function(_, i) { return i > wrTopicIndex && !wrTopicDone.has(i); });
  if (next !== -1) wrSelectTopic(next);
  else document.getElementById('wr-done-btn').textContent = '🎉 ALL DONE!';
}

function updateWrProgress() {
  const total = (battlePlan.topics || []).filter(function(t) { return t.cheatSheet; }).length;
  const done  = wrTopicDone.size;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('wr-progress-fill').style.width = pct + '%';
  document.getElementById('wr-progress-text').textContent = pct + '% complete (' + done + '/' + total + ')';
}

function toggleTimer() {
  const btn = document.getElementById('wr-timer-btn');
  if (wrTimerInterval) {
    clearWrTimer();
    btn.textContent = '▶ RESUME';
  } else {
    wrTimerInterval = setInterval(function() {
      wrSeconds++;
      // +1 pt per minute studied
      if (wrSeconds % 60 === 0) {
        pointsData.stats.minsStudied = (pointsData.stats.minsStudied || 0) + 1;
        addPoints(1, 'Study timer — 1 min active');
      }
      const m = String(Math.floor(wrSeconds / 60)).padStart(2, '0');
      const s = String(wrSeconds % 60).padStart(2, '0');
      document.getElementById('wr-timer').textContent = m + ':' + s;
    }, 1000);
    btn.textContent = '⏸ PAUSE';
  }
}

function clearWrTimer() {
  if (wrTimerInterval) { clearInterval(wrTimerInterval); wrTimerInterval = null; }
}

// ─── Self Exam ────────────────────────────────────────────
function buildExamQuestions() {
  if (!battlePlan) return;
  const pp = battlePlan.predictedPaper || {};
  examQuestions = [];
  (pp.sectionA || []).forEach(function(q) { examQuestions.push({ ...q, section: 'SECTION A', timeSeconds: 3 * 60 }); });
  (pp.sectionB || []).forEach(function(q) { examQuestions.push({ ...q, section: 'SECTION B', timeSeconds: 6 * 60 }); });
  (pp.sectionC || []).forEach(function(q) { examQuestions.push({ ...q, section: 'SECTION C', timeSeconds: 10 * 60 }); });
}

function showSelfExam() {
  if (!examQuestions.length) buildExamQuestions();
  if (!examQuestions.length) { alert('No exam questions found. Generate a battle plan first.'); return; }
  examIndex = 0;
  examScores = [];
  loadExamQuestion();
  document.getElementById('exam-feedback').classList.add('hidden');
  showScreen('screen-exam');
}

function loadExamQuestion() {
  if (examIndex >= examQuestions.length) { showResults(); return; }
  const q = examQuestions[examIndex];
  document.getElementById('exam-progress-text').textContent = 'Question ' + (examIndex + 1) + ' of ' + examQuestions.length;
  document.getElementById('exam-section-badge').textContent = q.section;
  document.getElementById('exam-marks-badge').textContent   = q.marks + ' MARKS';
  document.getElementById('exam-question').textContent      = q.question;
  document.getElementById('exam-answer').value              = '';
  document.getElementById('exam-feedback').classList.add('hidden');
  document.getElementById('exam-submit-btn').disabled       = false;
  document.getElementById('exam-submit-btn').textContent    = 'SUBMIT ANSWER →';
  updateExamScore();
  startExamTimer(q.timeSeconds);
}

function startExamTimer(seconds) {
  clearExamTimer();
  examTimeLeft = seconds;
  renderExamTimer();
  examTimerInterval = setInterval(function() {
    examTimeLeft--;
    renderExamTimer();
    if (examTimeLeft <= 0) { clearExamTimer(); submitExamAnswer(true); }
  }, 1000);
}

function renderExamTimer() {
  const m = String(Math.floor(examTimeLeft / 60)).padStart(2, '0');
  const s = String(examTimeLeft % 60).padStart(2, '0');
  const el = document.getElementById('exam-timer');
  el.textContent = m + ':' + s;
  el.classList.toggle('red', examTimeLeft <= 30);
}

function clearExamTimer() {
  if (examTimerInterval) { clearInterval(examTimerInterval); examTimerInterval = null; }
}

function updateExamScore() {
  const total = examScores.reduce(function(a, b) { return a + (b.scored || 0); }, 0);
  document.getElementById('exam-score-text').textContent = 'Score: ' + total + ' pts';
}

async function submitExamAnswer(timeout) {
  clearExamTimer();
  const q      = examQuestions[examIndex];
  const answer = document.getElementById('exam-answer').value.trim() || (timeout ? '[Time expired — no answer submitted]' : '');

  document.getElementById('exam-submit-btn').disabled    = true;
  document.getElementById('exam-submit-btn').textContent = 'GRADING...';

  try {
    const res  = await fetch('/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q.question, answer, maxMarks: q.marks, subject: studentData.subject }) });
    const json = await res.json();
    const grading = json.data || { scored: 0, maxMarks: q.marks, modelAnswer: '—', missed: '—', tip: '—' };

    examScores.push({ ...grading, question: q.question, section: q.section });

    // Award exam points
    const examPts = Math.round((grading.scored / q.marks) * 100);
    if (examPts > 0) addPoints(examPts, 'Self Exam — Q' + (examIndex + 1) + ' scored ' + grading.scored + '/' + q.marks);

    updateExamScore();
    showExamFeedback(grading, q.marks);
  } catch(err) {
    examScores.push({ scored: 0, maxMarks: q.marks, question: q.question, section: q.section, missed: 'Grading failed', modelAnswer: '—', tip: 'Check server connection' });
    showExamFeedback({ scored: 0, maxMarks: q.marks, modelAnswer: '—', missed: 'Grading unavailable', tip: 'Check server' }, q.marks);
  }
}

function showExamFeedback(g, maxMarks) {
  const pct   = maxMarks ? Math.round((g.scored / maxMarks) * 100) : 0;
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
  const isLast = examIndex >= examQuestions.length - 1;

  document.getElementById('exam-feedback').innerHTML =
    '<div class="feedback-score" style="color:' + color + '">' + g.scored + ' / ' + maxMarks + ' MARKS (' + pct + '%)</div>' +
    '<div class="feedback-section"><div class="feedback-label green">✓ MODEL ANSWER</div><div class="feedback-text">' + (g.modelAnswer || '—') + '</div></div>' +
    '<div class="feedback-section"><div class="feedback-label red">✗ WHAT YOU MISSED</div><div class="feedback-text">' + (g.missed || '—') + '</div></div>' +
    '<div class="feedback-section"><div class="feedback-label blue">→ IMPROVEMENT TIP</div><div class="feedback-text">' + (g.tip || '—') + '</div></div>' +
    '<button class="btn-primary btn-next-q" onclick="nextExamQuestion()">' + (isLast ? '🏆 SEE RESULTS →' : 'NEXT QUESTION →') + '</button>';

  document.getElementById('exam-feedback').classList.remove('hidden');
}

function nextExamQuestion() {
  examIndex++;
  if (examIndex >= examQuestions.length) showResults(); else loadExamQuestion();
}

// ─── Results ──────────────────────────────────────────────
function showResults() {
  clearExamTimer();
  const totalScored   = examScores.reduce(function(a, b) { return a + (b.scored   || 0); }, 0);
  const totalPossible = examScores.reduce(function(a, b) { return a + (b.maxMarks || 0); }, 0);
  const pct = totalPossible ? Math.round((totalScored / totalPossible) * 100) : 0;

  let emoji = '💀', verdict = 'FAILED — STUDY HARDER';
  if      (pct >= 90) { emoji = '🏆'; verdict = 'LEGENDARY — YOU\'RE READY'; }
  else if (pct >= 75) { emoji = '🔥'; verdict = 'STRONG — WELL PREPARED'; }
  else if (pct >= 60) { emoji = '⚡'; verdict = 'DECENT — FEW MORE REVISIONS'; }
  else if (pct >= 40) { emoji = '😅'; verdict = 'WEAK — MORE PRACTICE NEEDED'; }

  document.getElementById('results-emoji').textContent   = emoji;
  document.getElementById('results-pct').textContent     = pct + '%';
  document.getElementById('results-verdict').textContent = verdict;
  document.getElementById('results-score').textContent   = totalScored + ' / ' + totalPossible + ' total marks';

  document.getElementById('results-cards').innerHTML = examScores.map(function(s, i) {
    const p   = s.maxMarks ? Math.round((s.scored / s.maxMarks) * 100) : 0;
    const cls = p >= 75 ? 'good' : p >= 50 ? 'mid' : 'bad';
    return '<div class="result-card"><div class="result-card-header"><div class="result-qnum">' + s.section + ' — Q' + (i + 1) + '</div><div class="result-score ' + cls + '">' + s.scored + '/' + s.maxMarks + '</div></div><div class="result-qtext">' + s.question + '</div></div>';
  }).join('');

  showScreen('screen-results');
}

// ─── PDF Download ─────────────────────────────────────────
function downloadPDF() {
  if (!battlePlan) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 20, lineH = 7;
  let y = margin;

  const addText = function(text, size, color, bold) {
    size  = size  || 10;
    color = color || [240, 240, 240];
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text), pageW - margin * 2);
    lines.forEach(function(line) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); y += lineH;
    });
  };

  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, 210, 297, 'F');
  addText('⚔ COLOSSEUM — BATTLE PLAN', 22, [123, 92, 245], true); y += 4;
  addText(studentData.subject + ' | ' + studentData.university + ' | ' + studentData.semester, 11, [160, 160, 160]); y += 8;
  addText('UNIVERSITY EXAM DNA', 14, [123, 92, 245], true); y += 2;
  addText(battlePlan.universityDNA || '', 10, [200, 200, 200]); y += 8;
  addText('TOPIC PRIORITY', 14, [123, 92, 245], true); y += 2;
  (battlePlan.topics || []).forEach(function(t) { addText('[' + t.priority + '] ' + t.name + ' — ' + t.confidence + '% confidence — ' + t.expectedMarks + 'M — ' + t.hoursNeeded + 'h', 10, [200, 200, 200]); });
  y += 8;
  addText('HOUR-BY-HOUR SCHEDULE', 14, [123, 92, 245], true); y += 2;
  (battlePlan.schedule || []).forEach(function(s) { addText('HR ' + s.hour + ': ' + s.task, 10, [200, 200, 200]); });
  doc.save('Colosseum_BattlePlan_' + studentData.subject.replace(/\s+/g, '_') + '.pdf');
}

// ─── Paper Page ───────────────────────────────────────────
function showPaperPage() {
  if (!battlePlan) return;
  renderPaperPage();
  showScreen('screen-paper');
}

function renderPaperPage() {
  const pp        = battlePlan.predictedPaper || {};
  const container = document.getElementById('paper-page-content');

  const sections = [
    { key: 'sectionA', label: 'SECTION A — SHORT ANSWER',  marksLabel: '2 MARKS EACH',  color: '#7B5CF5' },
    { key: 'sectionB', label: 'SECTION B — MEDIUM ANSWER', marksLabel: '8 MARKS EACH',  color: '#00FF9C' },
    { key: 'sectionC', label: 'SECTION C — LONG ANSWER',   marksLabel: '16 MARKS EACH', color: '#FFD60A' },
  ];

  let html = '<div style="text-align:center;margin-bottom:40px;padding:32px;border:2px solid #7B5CF5;background:#0d0d0d"><div style="font-family:var(--font-mono);font-size:11px;color:#7B5CF5;letter-spacing:3px;margin-bottom:8px">AI PREDICTED</div><div style="font-family:var(--font-mono);font-size:22px;font-weight:700;color:#F0F0F0;margin-bottom:8px">' + (pp.title || studentData.subject + ' — Predicted Paper') + '</div><div style="font-family:var(--font-mono);font-size:11px;color:#555;letter-spacing:2px">' + studentData.university + ' · ' + studentData.semester + ' · ' + studentData.format + '</div></div>';

  sections.forEach(function(sec) {
    const qs = pp[sec.key] || [];
    if (!qs.length) return;
    html += '<div style="margin-bottom:48px"><div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #1a1a1a"><div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:' + sec.color + ';letter-spacing:2px">' + sec.label + '</div><div style="font-family:var(--font-mono);font-size:10px;color:#444;border:1px solid #333;padding:3px 8px">' + sec.marksLabel + '</div></div>';
    qs.forEach(function(q) {
      html += '<div style="margin-bottom:32px;background:#0a0a0a;border:1px solid #1e1e1e;border-left:3px solid ' + sec.color + ';padding:24px;border-radius:2px"><div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:20px"><div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:' + sec.color + ';min-width:32px">Q' + q.qNo + '.</div><div><div style="font-family:var(--font-mono);font-size:14px;color:#F0F0F0;line-height:1.6">' + q.question + '</div><div style="margin-top:6px;display:inline-block;font-family:var(--font-mono);font-size:10px;color:#555;border:1px solid #2a2a2a;padding:2px 8px">[' + q.marks + ' MARKS] · ' + (q.topic || '') + '</div></div></div>';
      if (q.diagram && q.diagram.trim())     html += '<div style="margin-bottom:16px;padding:16px;background:#0f0f0f;border:1px dashed #2a2a2a;border-radius:2px"><div style="font-family:var(--font-mono);font-size:10px;color:#7B5CF5;letter-spacing:2px;margin-bottom:10px">📐 DIAGRAM</div><div style="font-family:var(--font-mono);font-size:12px;color:#888;line-height:1.8;white-space:pre-wrap">' + q.diagram + '</div></div>';
      if (q.numerical && q.numerical.trim()) html += '<div style="margin-bottom:16px;padding:16px;background:#0a0f0a;border:1px dashed #1a3a1a;border-radius:2px"><div style="font-family:var(--font-mono);font-size:10px;color:#00FF9C;letter-spacing:2px;margin-bottom:10px">🔢 NUMERICAL SOLUTION</div><div style="font-family:var(--font-mono);font-size:12px;color:#aaa;line-height:2;white-space:pre-wrap">' + q.numerical + '</div></div>';
      if (q.answer)                          html += '<div style="padding:16px;background:#111;border:1px solid #222;border-radius:2px"><div style="font-family:var(--font-mono);font-size:10px;color:#00FF9C;letter-spacing:2px;margin-bottom:10px">✓ MODEL ANSWER</div><div style="font-family:\'DM Sans\',sans-serif;font-size:14px;color:#C8C8C8;line-height:1.8;white-space:pre-wrap">' + q.answer + '</div></div>';
      html += '</div>';
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

function downloadPaperPDF() {
  if (!battlePlan) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 18, lineH = 6.5;
  let y = margin;

  const chk = function(extra) {
    if (y + (extra || 0) > 278) { doc.addPage(); doc.setFillColor(8,8,8); doc.rect(0,0,210,297,'F'); y = margin; }
  };
  const write = function(text, size, rgb, bold) {
    doc.setFontSize(size || 10);
    doc.setTextColor(...(rgb || [200,200,200]));
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(String(text || ''), pageW - margin*2);
    lines.forEach(function(l) { chk(lineH); doc.text(l, margin, y); y += lineH; });
  };
  const line = function(rgb) { chk(3); doc.setDrawColor(...(rgb || [30,30,30])); doc.line(margin, y, pageW-margin, y); y += 5; };

  doc.setFillColor(8,8,8); doc.rect(0,0,210,297,'F');
  y = 30;
  write('AI PREDICTED QUESTION PAPER', 18, [123,92,245], true); y += 3;
  write((battlePlan.predictedPaper?.title || studentData.subject), 13, [240,240,240], true); y += 2;
  write(studentData.university + ' · ' + studentData.semester + ' · ' + studentData.format, 10, [100,100,100]);
  y += 10; line([50,50,50]);

  const sections = [
    { key:'sectionA', label:'SECTION A — SHORT ANSWER (2 MARKS)',  color:[123,92,245] },
    { key:'sectionB', label:'SECTION B — MEDIUM ANSWER (8 MARKS)', color:[0,200,120] },
    { key:'sectionC', label:'SECTION C — LONG ANSWER (16 MARKS)',  color:[220,180,0] },
  ];
  const pp = battlePlan.predictedPaper || {};
  sections.forEach(function(sec) {
    const qs = pp[sec.key] || [];
    if (!qs.length) return;
    y += 6; write(sec.label, 13, sec.color, true); y += 2; line(sec.color);
    qs.forEach(function(q) {
      y += 4; write('Q' + q.qNo + '. ' + q.question + '  [' + q.marks + 'M]', 11, [240,240,240], true); y += 2;
      if (q.diagram  && q.diagram.trim())   { write('DIAGRAM:', 9, [123,92,245], true);  write(q.diagram,   9, [150,150,150]); y += 2; }
      if (q.numerical && q.numerical.trim()) { write('NUMERICAL SOLUTION:', 9, [0,200,120], true); write(q.numerical, 9, [160,180,160]); y += 2; }
      if (q.answer)                          { write('MODEL ANSWER:', 9, [0,200,120], true); write(q.answer, 9, [190,190,190]); }
      y += 3; line([25,25,25]);
    });
  });
  doc.save('Colosseum_PredictedPaper_' + studentData.subject.replace(/\s+/g,'_') + '.pdf');
}

// ─── Interactive Lesson ───────────────────────────────────
let lessonCache = {};

async function openLesson(hour) {
  const schedule = battlePlan.schedule || [];
  const slot = schedule.find(function(s) { return s.hour === hour; });
  if (!slot) return;

  const displayTopic = (!slot.topic || slot.topic.toLowerCase() === 'all') ? slot.task : slot.topic;
  document.getElementById('teach-nav-title').textContent = '📚 HR ' + hour + ' — ' + displayTopic;
  document.getElementById('teach-content').innerHTML = renderLessonSkeleton(slot);
  showScreen('screen-teach');

  if (lessonCache[hour]) { renderLesson(hour, slot, lessonCache[hour]); return; }

  try {
    const res  = await fetch('/teach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: (!slot.topic || slot.topic.toLowerCase() === 'all') ? slot.task : slot.topic, task: slot.task, subject: studentData.subject, university: studentData.university, hours: studentData.hours }) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    lessonCache[hour] = { ...json.data, ytVideos: json.ytVideos || [] };
    renderLesson(hour, slot, lessonCache[hour]);
  } catch(err) {
    document.getElementById('teach-content').innerHTML = '<div style="text-align:center;padding:60px;font-family:var(--font-mono);color:var(--red)">LESSON FAILED: ' + err.message + '<br><br><button class="btn-primary" onclick="openLesson(' + hour + ')" style="margin-top:16px">↩ RETRY</button></div>';
  }
}

function renderLessonSkeleton(slot) {
  return '<div style="margin-bottom:32px"><div style="font-family:var(--font-mono);font-size:11px;color:#555;letter-spacing:3px;margin-bottom:8px">NOW STUDYING</div><div style="font-family:var(--font-mono);font-size:24px;font-weight:700;color:#F0F0F0">' + (slot.topic || slot.task) + '</div><div style="font-family:var(--font-mono);font-size:11px;color:#444;margin-top:6px">' + slot.task + '</div></div><div style="display:flex;flex-direction:column;gap:16px">' + [1,2,3,4].map(function() { return '<div style="height:80px;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:2px;animation:pulse 1.5s infinite"></div>'; }).join('') + '</div><style>@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}</style>';
}

function renderLesson(hour, slot, lesson) {
  const ytVideos = lesson.ytVideos || [];
  const ytHTML = ytVideos.length ? '<div class="lesson-block" style="border-color:#FF0000"><div class="lesson-block-label" style="color:#FF0000">▶ YOUTUBE — WATCH BEFORE STUDYING</div><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">' + ytVideos.map(function(v) { return '<a href="' + v.href + '" target="_blank" rel="noopener" style="display:flex;gap:12px;align-items:center;text-decoration:none;padding:10px;background:#0a0a0a;border:1px solid #1a1a1a"><img src="' + v.thumb + '" style="width:100px;height:56px;object-fit:cover;flex-shrink:0" /><div><div style="font-family:var(--font-mono);font-size:11px;color:#F0F0F0;line-height:1.5">' + v.title + '</div><div style="font-family:var(--font-mono);font-size:10px;color:#555;margin-top:4px">' + v.channel + '</div><div style="font-family:var(--font-mono);font-size:10px;color:#FF0000;margin-top:4px">▶ WATCH NOW →</div></div></a>'; }).join('') + '</div></div>' : '';

  document.getElementById('teach-content').innerHTML =
    '<div style="margin-bottom:32px"><div style="font-family:var(--font-mono);font-size:11px;color:#555;letter-spacing:3px;margin-bottom:8px">HOUR ' + hour + ' — NOW STUDYING</div><div style="font-family:var(--font-mono);font-size:26px;font-weight:700;color:#F0F0F0;line-height:1.2">' + (slot.topic || slot.task) + '</div><div style="font-family:var(--font-mono);font-size:11px;color:#444;margin-top:6px">' + slot.task + '</div></div>' +
    '<div style="padding:20px;background:#0d0d0d;border-left:4px solid #7B5CF5;margin-bottom:24px;font-family:var(--font-mono);font-size:15px;color:#C8C8C8;line-height:1.6;font-style:italic">"' + (lesson.hook || '') + '"</div>' +
    ytHTML +
    '<div class="lesson-block" style="border-color:#7B5CF5"><div class="lesson-block-label" style="color:#7B5CF5">⚡ CORE CONCEPT</div><div class="lesson-block-body">' + (lesson.coreConcept || '') + '</div></div>' +
    '<div class="lesson-block" style="border-color:#00FF9C"><div class="lesson-block-label" style="color:#00FF9C">✓ KEY POINTS — WHAT EXAMINER WANTS</div><ul style="margin:12px 0 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">' + (lesson.keyPoints || []).map(function(p, i) { return '<li style="display:flex;gap:12px;align-items:flex-start"><span style="font-family:var(--font-mono);font-size:11px;color:#00FF9C;min-width:20px;margin-top:2px">' + String(i+1).padStart(2,'0') + '</span><span style="font-family:\'DM Sans\',sans-serif;font-size:14px;color:#C8C8C8;line-height:1.6">' + p + '</span></li>'; }).join('') + '</ul></div>' +
    (lesson.formula ? '<div class="lesson-block" style="border-color:#FFD60A"><div class="lesson-block-label" style="color:#FFD60A">∑ FORMULA / ALGORITHM</div><div style="font-family:var(--font-mono);font-size:14px;color:#FFD60A;background:#0a0a00;padding:16px;margin-top:12px;border:1px solid #2a2a00;white-space:pre-wrap">' + lesson.formula + '</div></div>' : '') +
    (lesson.diagramSteps ? '<div class="lesson-block" style="border-color:#7B5CF5"><div class="lesson-block-label" style="color:#7B5CF5">📐 HOW TO DRAW THE DIAGRAM</div><div style="font-family:var(--font-mono);font-size:12px;color:#aaa;margin-top:12px;line-height:2;white-space:pre-wrap">' + lesson.diagramSteps + '</div></div>' : '') +
    '<div class="lesson-block" style="border-color:#FF6B6B"><div class="lesson-block-label" style="color:#FF6B6B">🧠 MEMORY TRICK</div><div class="lesson-block-body" style="color:#FF9999">' + (lesson.memoryTrick || '') + '</div></div>' +
    '<div class="lesson-block" style="border-color:#FFD60A;background:#0f0e00"><div class="lesson-block-label" style="color:#FFD60A">⚠ EXAM WARNING — DON\'T MAKE THIS MISTAKE</div><div class="lesson-block-body" style="color:#FFD680">' + (lesson.examWarning || '') + '</div></div>' +
    '<div class="lesson-block" style="border-color:#00FF9C;background:#000f08"><div class="lesson-block-label" style="color:#00FF9C">📝 QUICK QUIZ — LIKELY 2 MARK QUESTION</div><div class="lesson-block-body">' + (lesson.quickQuiz || '') + '</div></div>' +
    '<button class="btn-primary" id="teach-done-btn" onclick="markHourDone(' + hour + ')" style="width:100%;margin-top:32px;font-size:16px">✓ MARK HOUR ' + hour + ' DONE & GO BACK →</button>';
}

function markHourDone(hour) {
  const doneEl = document.getElementById('sched-done-' + hour);
  if (doneEl) doneEl.classList.remove('hidden');
  showScreen('screen-plan');
}

// ─── Init ─────────────────────────────────────────────────
showScreen('screen-form');