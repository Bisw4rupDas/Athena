/* ═══════════════════════════════════════════════════════════
   COLOSSEUM — CYBER BRUTALISM UI
   ═══════════════════════════════════════════════════════════ */

:root {
  --bg: #08080f;
  --bg2: #0f0f1a;
  --bg3: #14141f;
  --border: rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.13);
  --accent: #7B5CF5;
  --accent2: #9D7FF8;
  --green: #00FF9C;
  --red: #FF3B3B;
  --yellow: #FFD60A;
  --text: #F0F0F0;
  --text2: #A0A0A0;
  --text3: #444;
  --font-mono: 'Space Mono', monospace;
  --font-body: 'DM Sans', sans-serif;

  /* War Chest palette — shared everywhere */
  --wc-gold:   #FFD93D;
  --wc-orange: #FF6B35;
  --wc-pink:   #FF3CAC;
  --wc-cyan:   #00F5FF;
  --wc-lime:   #A8FF3E;
  --wc-purple: #7B5CF5;
  --wc-blue:   #0EA5E9;
  --wc-bg:     #08080f;
  --wc-card:   #10101a;
  --wc-border: rgba(255,255,255,0.07);
}

/* ─── Reset ─────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpolygon points='2,18 10,2 18,18 10,14' fill='%237B5CF5' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E") 10 2, crosshair;
}

/* ─── Screens ────────────────────────────────────────────── */
.screen { display: none; min-height: 100vh; }
.screen.active { display: block; }

/* ─── Header ─────────────────────────────────────────────── */
.site-header {
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  height: 60px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  background: rgba(8,8,15,0.96);
  backdrop-filter: blur(12px);
  z-index: 100;
}
.header-inner { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.logo {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 3px;
  background: linear-gradient(90deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.header-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 3px;
}

/* ─── Form Screen ────────────────────────────────────────── */
.form-main { max-width: 860px; margin: 0 auto; padding: 48px 24px 80px; }
.form-hero { margin-bottom: 40px; }
.form-hero-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--wc-cyan);
  letter-spacing: 4px;
  margin-bottom: 16px;
}
.form-title {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(26px, 5vw, 50px);
  line-height: 1.1;
  letter-spacing: -1px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 0%, var(--wc-cyan) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.form-sub { color: var(--text2); font-size: 16px; max-width: 540px; }

.form-card {
  border: 1px solid var(--border2);
  padding: 40px;
  position: relative;
  background: var(--bg2);
  border-radius: 16px;
}
.form-card::before {
  content: ''; position: absolute; top: -1px; left: -1px;
  width: 28px; height: 28px;
  border-top: 2px solid var(--wc-cyan); border-left: 2px solid var(--wc-cyan);
  border-radius: 16px 0 0 0;
}
.form-card::after {
  content: ''; position: absolute; bottom: -1px; right: -1px;
  width: 28px; height: 28px;
  border-bottom: 2px solid var(--wc-pink); border-right: 2px solid var(--wc-pink);
  border-radius: 0 0 16px 0;
}

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
.field-group { grid-column: span 2; }
.field-half { grid-column: span 1; }

.field-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--wc-cyan);
  letter-spacing: 3px;
  margin-bottom: 8px;
}
.field-hint { color: var(--text3); font-size: 10px; }

.field-input {
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  padding: 12px 16px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  border-radius: 10px;
  -webkit-appearance: none;
}
.field-input:focus {
  border-color: var(--wc-cyan);
  box-shadow: 0 0 0 3px rgba(0,245,255,0.08);
}
.field-input::placeholder { color: var(--text3); }
.field-select { cursor: pointer; }
.field-select option { background: var(--bg3); }

/* Slider */
.slider-wrap { margin: 8px 0 4px; }
.field-slider {
  width: 100%; -webkit-appearance: none; appearance: none;
  height: 4px;
  background: linear-gradient(90deg, var(--wc-purple), var(--wc-cyan));
  outline: none; border: none; padding: 0; border-radius: 4px;
}
.field-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px;
  background: var(--wc-cyan); cursor: pointer;
  border: 3px solid var(--bg); border-radius: 50%;
  box-shadow: 0 0 10px rgba(0,245,255,0.5);
}
.slider-labels { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--text3); margin-top: 4px; }
.hours-display {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  margin-top: 8px;
  background: linear-gradient(90deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.mode-badge { font-size: 10px; padding: 2px 8px; border: 1px solid; margin-left: 8px; border-radius: 20px; }
.mode-badge.emergency { color: var(--red); border-color: var(--red); }
.mode-badge.focused { color: var(--yellow); border-color: var(--yellow); }
.mode-badge.full { color: var(--wc-lime); border-color: var(--wc-lime); }
.mode-badge.ace { color: var(--wc-cyan); border-color: var(--wc-cyan); }

/* Upload Zone */
.upload-zone {
  border: 1px dashed var(--border2);
  padding: 32px; text-align: center;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  background: var(--bg3);
  border-radius: 12px;
}
.upload-zone:hover, .upload-zone.dragover {
  border-color: var(--wc-cyan);
  background: rgba(0,245,255,0.04);
}
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-text { font-family: var(--font-mono); font-size: 13px; color: var(--text2); margin-bottom: 4px; }
.upload-sub { font-size: 12px; color: var(--text3); }

.file-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.file-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: var(--bg); border: 1px solid var(--border);
  font-family: var(--font-mono); font-size: 12px; color: var(--wc-lime);
  border-radius: 8px;
}
.file-remove { cursor: pointer; color: var(--red); font-size: 16px; line-height: 1; }

/* Buttons */
.btn-primary {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 18px 24px;
  background: linear-gradient(135deg, var(--wc-purple), var(--wc-pink));
  color: #fff;
  font-family: var(--font-mono); font-size: 14px; font-weight: 700;
  letter-spacing: 2px; border: none; cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(123,92,245,0.35);
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:active { transform: scale(0.99); }
.btn-primary:disabled {
  background: var(--bg3);
  box-shadow: none;
  cursor: not-allowed;
}
.btn-secondary {
  padding: 12px 24px; background: transparent; border: 1px solid var(--border2);
  color: var(--text2); font-family: var(--font-mono); font-size: 12px;
  cursor: pointer; transition: all 0.2s; border-radius: 10px;
}
.btn-secondary:hover { border-color: var(--wc-cyan); color: var(--wc-cyan); }
.btn-arrow { font-size: 18px; }
.btn-text { letter-spacing: 3px; }

/* ─── Loading Screen ─────────────────────────────────────── */
#screen-loading {
  display: none;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
#screen-loading.active {
  display: flex !important;
}
.loading-inner {
  text-align: center;
  max-width: 480px;
  padding: 40px;
  width: 100%;
}
.loading-title {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 32px;
  letter-spacing: 4px;
  background: linear-gradient(90deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.loading-title.emergency { background: linear-gradient(90deg, var(--red), var(--wc-orange)); -webkit-background-clip: text; background-clip: text; }
.loading-bar-wrap { margin-bottom: 16px; }
.loading-bar-track { height: 3px; background: var(--border); position: relative; border-radius: 3px; overflow: hidden; }
.loading-bar-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--wc-purple), var(--wc-cyan));
  transition: width 0.4s ease;
  border-radius: 3px;
  box-shadow: 0 0 10px rgba(0,245,255,0.5);
}
.loading-pct { font-family: var(--font-mono); font-size: 12px; color: var(--text3); margin-top: 8px; }
.loading-msg { font-family: var(--font-mono); font-size: 13px; color: var(--text2); margin-bottom: 32px; min-height: 20px; letter-spacing: 1px; }
.loading-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 auto; width: 60px; }
.loading-dot {
  width: 14px; height: 14px;
  background: var(--border2);
  border-radius: 3px;
  animation: dotPulse 1.2s ease-in-out infinite;
}
.loading-dot:nth-child(1) { animation-delay: 0s; }
.loading-dot:nth-child(2) { animation-delay: 0.1s; }
.loading-dot:nth-child(3) { animation-delay: 0.2s; }
.loading-dot:nth-child(4) { animation-delay: 0.3s; }
.loading-dot:nth-child(5) { animation-delay: 0.4s; }
.loading-dot:nth-child(6) { animation-delay: 0.5s; }
@keyframes dotPulse {
  0%, 100% { background: var(--border2); }
  50% { background: var(--wc-purple); box-shadow: 0 0 8px rgba(123,92,245,0.6); }
}

/* ─── Plan Nav ───────────────────────────────────────────── */
.plan-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  border-bottom: 1px solid var(--border);
  background: rgba(8,8,15,0.96);
  backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 100;
}
.plan-nav-logo {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(90deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.plan-nav-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-nav {
  padding: 7px 13px;
  background: linear-gradient(135deg, var(--wc-purple), var(--wc-pink));
  color: #fff;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px;
  border: none; cursor: pointer; border-radius: 8px;
  transition: opacity 0.2s, transform 0.1s;
  box-shadow: 0 2px 10px rgba(123,92,245,0.3);
}
.btn-nav:hover { opacity: 0.88; transform: translateY(-1px); }
.btn-nav-ghost {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--text2);
  box-shadow: none;
}
.btn-nav-ghost:hover { border-color: var(--wc-cyan); color: var(--wc-cyan); transform: none; }
.btn-nav-points {
  background: linear-gradient(135deg, var(--wc-gold), var(--wc-orange));
  color: #000;
  box-shadow: 0 2px 12px rgba(255,217,61,0.35);
}

/* ─── Plan Content ───────────────────────────────────────── */
.plan-content { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
.plan-section { margin-bottom: 64px; }
.section-header {
  display: flex; align-items: baseline; gap: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}
.section-num { font-family: var(--font-mono); font-size: 11px; color: var(--wc-cyan); letter-spacing: 3px; }
.section-title { font-family: var(--font-mono); font-size: 17px; font-weight: 700; letter-spacing: 2px; }

/* Emergency Banner */
.emergency-banner {
  background: linear-gradient(90deg, var(--red), var(--wc-orange));
  color: #fff; font-family: var(--font-mono);
  font-size: 13px; font-weight: 700; text-align: center; padding: 12px;
  letter-spacing: 2px; margin-bottom: 32px; animation: pulse 1s infinite;
  border-radius: 10px;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }
.hidden { display: none !important; }

/* DNA Card */
.dna-card {
  border: 1px solid var(--border2); padding: 28px;
  background: var(--bg2); line-height: 1.8; color: var(--text2); font-size: 15px;
  position: relative; border-radius: 12px;
}
.dna-card::before {
  content: ''; position: absolute; top: -1px; left: -1px;
  width: 20px; height: 20px;
  border-top: 2px solid var(--wc-cyan); border-left: 2px solid var(--wc-cyan);
  border-radius: 12px 0 0 0;
}

/* Charts */
.charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.chart-box {
  border: 1px solid var(--border); padding: 24px;
  background: var(--bg2); border-radius: 12px;
}
.chart-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 3px; margin-bottom: 16px; }

/* Table */
.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px;
  color: var(--text3); padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--border2); white-space: nowrap;
  background: var(--bg2);
}
.data-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); vertical-align: top; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: rgba(255,255,255,0.02); }
.priority-badge {
  font-family: var(--font-mono); font-size: 10px; font-weight: 700;
  padding: 3px 10px; letter-spacing: 1px; white-space: nowrap; border-radius: 20px;
}
.priority-must { background: linear-gradient(135deg, var(--wc-purple), var(--wc-pink)); color: #fff; }
.priority-high { background: transparent; border: 1px solid var(--yellow); color: var(--yellow); }
.priority-medium { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
.priority-skip { background: transparent; border: 1px solid var(--border); color: var(--text3); }
.conf-bar { height: 4px; background: var(--border); margin-top: 6px; border-radius: 4px; overflow: hidden; }
.conf-fill { height: 100%; background: linear-gradient(90deg, var(--wc-purple), var(--wc-cyan)); }

/* Predicted Paper */
.predicted-paper { border: 1px solid var(--border); background: var(--bg2); border-radius: 12px; overflow: hidden; }
.paper-header { padding: 24px 32px; border-bottom: 1px solid var(--border); }
.paper-title { font-family: var(--font-mono); font-size: 17px; font-weight: 700; margin-bottom: 4px; }
.paper-sub { font-family: var(--font-mono); font-size: 11px; color: var(--text3); letter-spacing: 2px; }
.paper-section { padding: 24px 32px; border-bottom: 1px solid var(--border); }
.paper-section-title { font-family: var(--font-mono); font-size: 12px; color: var(--wc-cyan); letter-spacing: 3px; margin-bottom: 16px; }
.paper-question { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.paper-question:last-child { border-bottom: none; }
.paper-qno { font-family: var(--font-mono); font-size: 12px; color: var(--text3); min-width: 32px; }
.paper-qtext { flex: 1; font-size: 14px; line-height: 1.6; }
.paper-marks { font-family: var(--font-mono); font-size: 11px; color: var(--wc-lime); white-space: nowrap; }

/* Schedule */
.schedule-grid { display: flex; flex-direction: column; gap: 8px; }
.schedule-item {
  display: grid;
  grid-template-columns: 60px 80px 1fr auto auto;
  align-items: center; gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--border);
  background: var(--bg2);
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
}
.sched-clickable:hover {
  border-color: var(--wc-purple);
  background: rgba(123,92,245,0.06);
}
.sched-break { opacity: 0.5; }
.sched-hour { font-family: var(--font-mono); font-size: 12px; color: var(--wc-cyan); }
.sched-type { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--text3); }
.sched-task { font-size: 14px; }
.sched-cta { font-family: var(--font-mono); font-size: 10px; color: var(--wc-purple); letter-spacing: 1px; white-space: nowrap; }
.sched-done-badge {
  font-family: var(--font-mono); font-size: 10px; color: var(--wc-lime);
  border: 1px solid var(--wc-lime); padding: 2px 8px; border-radius: 20px;
}

/* Cheat Sheets */
.cheatsheets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.cheat-card {
  border: 1px solid var(--border); background: var(--bg2); padding: 24px;
  position: relative; border-radius: 12px;
}
.cheat-card::before {
  content: ''; position: absolute; top: -1px; left: -1px;
  width: 16px; height: 16px;
  border-top: 2px solid var(--wc-cyan); border-left: 2px solid var(--wc-cyan);
  border-radius: 12px 0 0 0;
}
.cheat-topic { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--wc-cyan); margin-bottom: 16px; letter-spacing: 1px; }
.cheat-row { margin-bottom: 14px; }
.cheat-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 3px; margin-bottom: 6px; }
.cheat-val { font-size: 13px; color: var(--text2); line-height: 1.6; }
.cheat-list { list-style: none; }
.cheat-list li::before { content: '→ '; color: var(--wc-cyan); font-family: var(--font-mono); }
.cheat-tip { background: var(--bg3); border-left: 2px solid var(--wc-lime); padding: 10px 14px; font-size: 13px; color: var(--wc-lime); line-height: 1.5; border-radius: 0 8px 8px 0; }

/* YouTube */
.youtube-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.yt-topic-block { border: 1px solid var(--border); background: var(--bg2); padding: 20px; border-radius: 12px; }
.yt-topic-name { font-family: var(--font-mono); font-size: 11px; color: var(--wc-cyan); letter-spacing: 2px; margin-bottom: 14px; }
.yt-card { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.yt-card:last-child { border-bottom: none; }
.yt-thumb { width: 96px; height: 54px; object-fit: cover; flex-shrink: 0; border-radius: 6px; }
.yt-info { flex: 1; min-width: 0; }
.yt-title { font-size: 13px; line-height: 1.4; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.yt-channel { font-size: 11px; color: var(--text3); margin-bottom: 6px; }
.yt-watch { font-family: var(--font-mono); font-size: 11px; color: var(--wc-pink); text-decoration: none; letter-spacing: 1px; }
.yt-watch:hover { color: var(--wc-orange); }
.yt-loading { font-family: var(--font-mono); font-size: 12px; color: var(--text3); padding: 20px; }
.yt-no-result { font-size: 12px; color: var(--text3); padding: 8px 0; }

/* Bhaiya */
.bhaiya-box { border: 1px solid var(--border); background: var(--bg2); padding: 24px; border-radius: 12px; }
.bhaiya-intro { font-size: 14px; color: var(--text2); margin-bottom: 16px; border-left: 2px solid var(--wc-cyan); padding-left: 14px; }
.quick-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.chip {
  font-family: var(--font-mono); font-size: 11px; padding: 6px 14px;
  border: 1px solid var(--border2); background: transparent; color: var(--text2);
  cursor: pointer; transition: all 0.15s; letter-spacing: 1px; border-radius: 20px;
}
.chip:hover { border-color: var(--wc-cyan); color: var(--wc-cyan); }
.bhaiya-chat { min-height: 120px; max-height: 360px; overflow-y: auto; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
.bhaiya-msg { display: flex; gap: 10px; }
.bhaiya-msg.user { flex-direction: row-reverse; }
.bhaiya-bubble { max-width: 80%; padding: 12px 16px; font-size: 14px; line-height: 1.6; border: 1px solid var(--border); border-radius: 12px; }
.bhaiya-msg.bot .bhaiya-bubble { background: var(--bg3); border-left: 2px solid var(--wc-cyan); }
.bhaiya-msg.user .bhaiya-bubble { background: var(--bg3); border-right: 2px solid var(--text3); text-align: right; }
.bhaiya-input-row { display: flex; gap: 8px; }
.bhaiya-input { flex: 1; }
.btn-send {
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--wc-purple), var(--wc-pink));
  border: none; color: #fff;
  font-family: var(--font-mono); font-size: 12px; cursor: pointer; border-radius: 10px;
  white-space: nowrap;
}
.btn-send:hover { opacity: 0.88; }

/* ─── War Room ───────────────────────────────────────────── */
.warroom-layout { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 60px); }
.warroom-sidebar { border-right: 1px solid var(--border); padding: 24px; background: var(--bg2); overflow-y: auto; }
.sidebar-title { font-family: var(--font-mono); font-size: 10px; color: var(--wc-cyan); letter-spacing: 3px; margin-bottom: 16px; }
.warroom-checklist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 24px; }
.wr-check-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid var(--border); cursor: pointer; transition: all 0.15s;
  font-size: 13px; border-radius: 10px;
}
.wr-check-item:hover { border-color: var(--wc-cyan); }
.wr-check-item.active { border-color: var(--wc-purple); background: rgba(123,92,245,0.08); }
.wr-check-item.done { opacity: 0.4; text-decoration: line-through; }
.wr-checkbox { width: 14px; height: 14px; border: 1px solid var(--border2); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; border-radius: 4px; }
.wr-check-item.done .wr-checkbox { background: var(--wc-lime); border-color: var(--wc-lime); color: #000; }
.warroom-progress-label { font-family: var(--font-mono); font-size: 10px; color: var(--text3); letter-spacing: 3px; margin-bottom: 8px; }
.warroom-progress-bar { height: 4px; background: var(--border); border-radius: 4px; overflow: hidden; }
.warroom-progress-fill { height: 100%; background: linear-gradient(90deg, var(--wc-purple), var(--wc-lime)); transition: width 0.4s; }
.wr-progress-text { font-family: var(--font-mono); font-size: 12px; color: var(--wc-lime); margin-top: 8px; }
.warroom-main { padding: 32px; overflow-y: auto; }
.wr-timer-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.wr-timer {
  font-family: var(--font-mono); font-size: 40px; font-weight: 700; letter-spacing: 4px;
  background: linear-gradient(90deg, var(--wc-cyan), var(--wc-lime));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.btn-timer {
  font-family: var(--font-mono); font-size: 12px; padding: 10px 20px;
  border: 1px solid var(--wc-purple); background: transparent; color: var(--wc-purple);
  cursor: pointer; border-radius: 10px; transition: all 0.15s;
}
.btn-timer:hover { background: var(--wc-purple); color: #fff; }
.wr-topic-name { font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 24px; letter-spacing: 1px; }
.wr-cheatsheet { border: 1px solid var(--border); padding: 24px; background: var(--bg2); margin-bottom: 24px; border-radius: 12px; }
.wr-done-btn { margin-top: 8px; }

/* ─── Self Exam ──────────────────────────────────────────── */
.exam-layout { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
.exam-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.exam-progress-text { font-family: var(--font-mono); font-size: 12px; color: var(--text3); }
.exam-timer { font-family: var(--font-mono); font-size: 28px; font-weight: 700; color: var(--wc-cyan); }
.exam-timer.red { color: var(--red); animation: pulse 0.5s infinite; }
.exam-score-text { font-family: var(--font-mono); font-size: 12px; color: var(--wc-lime); }
.exam-card { border: 1px solid var(--border); padding: 32px; background: var(--bg2); margin-bottom: 24px; border-radius: 14px; }
.exam-section-badge { font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; color: var(--wc-cyan); margin-bottom: 8px; }
.exam-marks-badge { font-family: var(--font-mono); font-size: 11px; color: var(--text3); margin-bottom: 20px; }
.exam-question { font-size: 17px; line-height: 1.7; margin-bottom: 24px; }
.exam-answer {
  width: 100%; min-height: 160px; background: var(--bg3);
  border: 1px solid var(--border); color: var(--text);
  font-family: var(--font-body); font-size: 14px; padding: 16px;
  resize: vertical; outline: none; margin-bottom: 16px; border-radius: 10px;
}
.exam-answer:focus { border-color: var(--wc-cyan); box-shadow: 0 0 0 3px rgba(0,245,255,0.07); }
.exam-feedback {
  border: 1px solid var(--border); padding: 24px; background: var(--bg2);
  animation: slideIn 0.3s ease; border-radius: 12px;
}
@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.feedback-score { font-family: var(--font-mono); font-size: 28px; font-weight: 700; margin-bottom: 16px; }
.feedback-section { margin-bottom: 14px; }
.feedback-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; margin-bottom: 6px; }
.feedback-label.green { color: var(--wc-lime); }
.feedback-label.red { color: var(--red); }
.feedback-label.blue { color: var(--wc-cyan); }
.feedback-text { font-size: 14px; line-height: 1.6; color: var(--text2); }
.btn-next-q { margin-top: 16px; width: auto; display: inline-flex; }

/* ─── Results ────────────────────────────────────────────── */
.results-layout { max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
.results-hero {
  text-align: center; margin-bottom: 48px; padding: 48px;
  border: 1px solid var(--border); background: var(--bg2); border-radius: 16px;
  position: relative; overflow: hidden;
}
.results-hero::before {
  content: '';
  position: absolute; top: 50%; left: 50%;
  width: 400px; height: 400px;
  transform: translate(-50%,-50%);
  background: radial-gradient(ellipse, rgba(123,92,245,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.results-emoji { font-size: 64px; margin-bottom: 16px; }
.results-pct {
  font-family: var(--font-mono); font-size: 72px; font-weight: 700; line-height: 1; margin-bottom: 8px;
  background: linear-gradient(135deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.results-verdict { font-family: var(--font-mono); font-size: 18px; color: var(--text2); margin-bottom: 8px; letter-spacing: 2px; }
.results-score { font-family: var(--font-mono); font-size: 14px; color: var(--text3); }
.results-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
.result-card { border: 1px solid var(--border); padding: 20px 24px; background: var(--bg2); border-radius: 12px; }
.result-card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.result-qnum { font-family: var(--font-mono); font-size: 11px; color: var(--text3); }
.result-score { font-family: var(--font-mono); font-size: 16px; font-weight: 700; }
.result-score.good { color: var(--wc-lime); }
.result-score.mid { color: var(--yellow); }
.result-score.bad { color: var(--red); }
.result-qtext { font-size: 13px; color: var(--text2); line-height: 1.5; }
.results-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.results-actions .btn-primary { width: auto; flex: 1; min-width: 160px; }
.results-actions .btn-secondary { flex: 1; min-width: 160px; }

/* ─── Responsive ─────────────────────────────────────────── */
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .field-half { grid-column: span 1; }
  .charts-grid { grid-template-columns: 1fr; }
  .warroom-layout { grid-template-columns: 1fr; }
  .warroom-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
  .plan-nav-actions { gap: 4px; }
  .btn-nav { font-size: 9px; padding: 6px 9px; }
  .form-card { padding: 24px; }
  .cheatsheets-grid { grid-template-columns: 1fr; }
  .youtube-grid { grid-template-columns: 1fr; }
  .schedule-item { grid-template-columns: 50px 1fr; }
  .sched-type, .sched-cta { display: none; }
}

/* ═══════════════════════════════════════════════════════════
   WAR CHEST — VIVID COLORFUL REDESIGN
   ═══════════════════════════════════════════════════════════ */
#screen-points { background: var(--wc-bg); min-height: 100vh; }
.wc-page { max-width: 520px; margin: 0 auto; padding: 0 0 100px; }

#screen-points .plan-nav {
  background: rgba(8,8,15,0.96);
  border-bottom: 1px solid var(--wc-border);
}
#screen-points .plan-nav-logo {
  background: linear-gradient(90deg, var(--wc-gold), var(--wc-orange));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  font-size: 16px !important; letter-spacing: 0.12em !important;
}

.wc-hero {
  position: relative; text-align: center;
  padding: 48px 24px 36px; overflow: hidden;
}
.wc-hero::before {
  content: ''; position: absolute; top: 50%; left: 50%;
  width: 340px; height: 340px; transform: translate(-50%,-50%);
  background: radial-gradient(ellipse at center, rgba(255,217,61,0.18) 0%, rgba(255,107,53,0.10) 40%, transparent 70%);
  animation: heroGlow 4s ease-in-out infinite alternate;
  pointer-events: none; border-radius: 50%;
}
@keyframes heroGlow {
  0%   { transform: translate(-50%,-50%) scale(0.9); opacity: 0.6; }
  100% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
}
.wc-hero-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: rgba(255,255,255,0.35); margin-bottom: 8px; position: relative; }
.wc-hero-number {
  font-family: var(--font-mono); font-size: clamp(64px,18vw,96px); font-weight: 700; line-height: 1;
  background: linear-gradient(135deg, var(--wc-gold) 0%, var(--wc-orange) 50%, var(--wc-pink) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  position: relative; animation: numberPulse 3s ease-in-out infinite;
}
@keyframes numberPulse {
  0%,100% { filter: drop-shadow(0 0 24px rgba(255,107,53,0.35)); }
  50%      { filter: drop-shadow(0 0 48px rgba(255,217,61,0.55)); }
}
.wc-hero-unit { font-family: var(--font-mono); font-size: 11px; letter-spacing: 6px; color: var(--wc-gold); margin-top: 4px; position: relative; }
.wc-rank {
  display: inline-block; margin-top: 16px; padding: 6px 20px;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 3px;
  background: linear-gradient(90deg, var(--wc-pink), var(--wc-purple));
  border-radius: 100px; position: relative; animation: rankShimmer 2s ease-in-out infinite;
}
@keyframes rankShimmer {
  0%,100% { box-shadow: 0 0 12px rgba(255,60,172,0.4); }
  50%      { box-shadow: 0 0 28px rgba(123,92,245,0.6); }
}
.wc-progress-wrap { margin: 16px auto 0; max-width: 280px; position: relative; }
.wc-progress-wrap .wc-prog-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin-bottom: 6px; }
.wc-progress-wrap .wc-prog-fill { height: 100%; background: linear-gradient(90deg, var(--wc-cyan), var(--wc-lime)); border-radius: 10px; transition: width 0.6s cubic-bezier(.34,1.56,.64,1); box-shadow: 0 0 8px rgba(0,245,255,0.6); }
.wc-progress-wrap .wc-prog-label { font-family: var(--font-mono); font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 2px; }
.wc-stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--wc-border); border: 1px solid var(--wc-border); margin: 0 16px 24px; border-radius: 12px; overflow: hidden; }
.wc-stat { background: var(--wc-card); padding: 18px 8px; text-align: center; }
.wc-stat:hover { background: rgba(255,255,255,0.04); }
.wc-stat-val { font-family: var(--font-mono); font-size: 26px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
.wc-stat:nth-child(1) .wc-stat-val { color: var(--wc-cyan); }
.wc-stat:nth-child(2) .wc-stat-val { color: var(--wc-lime); }
.wc-stat:nth-child(3) .wc-stat-val { color: var(--wc-pink); }
.wc-stat-lbl { font-family: var(--font-mono); font-size: 8px; letter-spacing: 2px; color: rgba(255,255,255,0.3); }
.wc-tabs { display: flex; margin: 0 16px 8px; gap: 4px; background: var(--wc-card); padding: 4px; border-radius: 10px; border: 1px solid var(--wc-border); }
.wc-tab { flex: 1; text-align: center; padding: 9px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: rgba(255,255,255,0.35); cursor: pointer; border-radius: 7px; transition: all 0.2s; }
.wc-tab:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); }
.wc-tab.active { background: linear-gradient(135deg, var(--wc-purple), var(--wc-pink)); color: #fff; box-shadow: 0 2px 12px rgba(123,92,245,0.4); }
.wc-section-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 4px; color: rgba(255,255,255,0.25); padding: 20px 24px 8px; }
.wc-history { margin: 0 16px 8px; display: flex; flex-direction: column; gap: 4px; }
.wc-hist-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--wc-card); border-radius: 10px; border: 1px solid var(--wc-border); transition: border-color 0.2s; }
.wc-hist-item:hover { border-color: rgba(255,255,255,0.15); }
.wc-hist-reason { font-size: 13px; color: rgba(255,255,255,0.75); }
.wc-hist-time { font-family: var(--font-mono); font-size: 10px; color: rgba(255,255,255,0.25); }
.wc-hist-pts { font-family: var(--font-mono); font-size: 13px; font-weight: 700; }
.wc-hist-pts.earn { color: var(--wc-lime); }
.wc-hist-pts.spend { color: var(--wc-pink); }
.wc-rewards { display: flex; flex-direction: column; gap: 10px; margin: 0 16px 8px; }
.wc-reward-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--wc-card); border-radius: 12px; border: 1px solid var(--wc-border); cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
.wc-reward-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(255,217,61,0.06),rgba(255,107,53,0.06)); opacity: 0; transition: opacity 0.2s; }
.wc-reward-card:hover::before { opacity: 1; }
.wc-reward-card:hover { border-color: var(--wc-gold); box-shadow: 0 0 20px rgba(255,217,61,0.15); }
.wc-reward-card.locked { opacity: 0.4; cursor: not-allowed; }
.wc-reward-card.locked:hover { border-color: var(--wc-border); box-shadow: none; }
.wc-reward-icon { font-size: 28px; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,rgba(255,217,61,0.15),rgba(255,107,53,0.15)); border-radius: 12px; flex-shrink: 0; }
.wc-reward-body { flex: 1; }
.wc-reward-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.wc-reward-cost { font-family: var(--font-mono); font-size: 11px; color: var(--wc-gold); letter-spacing: 1px; }
.wc-reward-action { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2px; padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap; background: linear-gradient(135deg,var(--wc-gold),var(--wc-orange)); color: #000; transition: all 0.2s; }
.wc-reward-action:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(255,107,53,0.4); }
.wc-reward-action:disabled { background: var(--border); color: var(--text3); cursor: not-allowed; transform: none; box-shadow: none; }
.wc-badges { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 16px 8px; }
.wc-badge { padding: 16px; background: var(--wc-card); border-radius: 12px; border: 1px solid var(--wc-border); text-align: center; transition: all 0.2s; }
.wc-badge.earned { border-color: transparent; animation: badgeGlow 3s ease-in-out infinite; }
@keyframes badgeGlow { 0%,100% { box-shadow: 0 0 0 1px rgba(255,217,61,0.3); } 50% { box-shadow: 0 0 0 1px rgba(255,217,61,0.6),0 0 20px rgba(255,217,61,0.15); } }
.wc-badge.locked { opacity: 0.35; filter: grayscale(1); }
.wc-badge-icon { font-size: 32px; margin-bottom: 8px; display: block; }
.wc-badge-name { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,0.6); margin-bottom: 2px; }
.wc-badge-pts { font-family: var(--font-mono); font-size: 9px; color: rgba(255,255,255,0.25); letter-spacing: 1px; }
.wc-qr-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; }
.wc-qr-overlay.hidden { display: none !important; }
.wc-qr-card { background: var(--wc-card); border: 1px solid var(--wc-gold); border-radius: 20px; padding: 36px 28px; text-align: center; max-width: 320px; width: 100%; box-shadow: 0 0 60px rgba(255,217,61,0.25),0 0 120px rgba(255,107,53,0.1); animation: qrEntrance 0.3s cubic-bezier(.34,1.56,.64,1); }
@keyframes qrEntrance { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.wc-qr-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 4px; color: rgba(255,255,255,0.4); margin-bottom: 8px; }
.wc-qr-value { font-family: var(--font-mono); font-size: 40px; font-weight: 700; background: linear-gradient(135deg,var(--wc-gold),var(--wc-orange)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 24px; }
.wc-qr-box { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.wc-qr-code { font-family: var(--font-mono); font-size: 22px; font-weight: 700; color: #000; letter-spacing: 3px; margin-bottom: 8px; }
.wc-qr-sub { font-size: 11px; color: rgba(0,0,0,0.5); }
.wc-qr-expire { font-family: var(--font-mono); font-size: 11px; color: var(--wc-orange); margin-bottom: 20px; letter-spacing: 1px; }
.wc-qr-close { font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; padding: 12px 32px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.wc-qr-close:hover { border-color: rgba(255,255,255,0.5); color: #fff; }

/* Points toast */
#pts-toast {
  background: linear-gradient(135deg,rgba(0,245,255,0.12),rgba(168,255,62,0.08)) !important;
  border: 1px solid rgba(0,245,255,0.4) !important;
  color: var(--wc-cyan) !important;
  border-radius: 10px !important;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0,245,255,0.2);
}
#screen-points ::-webkit-scrollbar { width: 4px; }
#screen-points ::-webkit-scrollbar-track { background: transparent; }
#screen-points ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }