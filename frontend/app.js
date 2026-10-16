/**
 * app.js – AI Mock Interview v4
 */

const API_BASE = "http://127.0.0.1:8000";

// State
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let timerInterval = null;
let timerSeconds = 0;
let sessionInterval = null;
let sessionSeconds = 0;
let analyser = null;
let analyserAnimId = null;
let audioCtx = null;
let questionCount = 0;
let messageCount = 0;
let resumeBlobUrl = null;
let resumeFileName = '';

// DOM
const transcriptScroll = document.getElementById("transcript-scroll");
const typingIndicator = document.getElementById("typing-indicator");
const statusBadge = document.getElementById("status-badge");
const statusText = document.getElementById("status-text");
const recordBtn = document.getElementById("record-btn");
const recordIcon = document.getElementById("record-icon");
const recordLabel = document.getElementById("record-label");
const micRing = document.getElementById("mic-ring");
const timerEl = document.getElementById("timer");
const progressWrap = document.getElementById("progress-bar-wrap");
const progressFill = document.getElementById("progress-bar-fill");
const hintText = document.getElementById("hint-text");
const concentricRings = document.getElementById("concentric-rings");

const resumeSection = document.getElementById("resume-section");
const interviewPhase = document.getElementById("interview-phase");
const scorecardPhase = document.getElementById("scorecard-phase");

const dropZone = document.getElementById("drop-zone");
const resumeInput = document.getElementById("resume-input");
const resumeAnalysis = document.getElementById("resume-analysis");
const resumeLoading = document.getElementById("resume-loading");

// Build dual waveform bars
const BARS_PER_SIDE = 18;
const waveLeft = document.getElementById("waveform-left");
const waveRight = document.getElementById("waveform-right");

for (let i = 0; i < BARS_PER_SIDE; i++) {
  const barL = document.createElement("div");
  barL.className = "wv-bar";
  waveLeft.appendChild(barL);

  const barR = document.createElement("div");
  barR.className = "wv-bar";
  waveRight.appendChild(barR);
}

const leftBars = waveLeft.querySelectorAll(".wv-bar");
const rightBars = waveRight.querySelectorAll(".wv-bar");

// RESUME UPLOAD
dropZone.addEventListener("click", () => resumeInput.click());
resumeInput.addEventListener("change", (e) => { if (e.target.files.length > 0) uploadResume(e.target.files[0]); });
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => { e.preventDefault(); dropZone.classList.remove("drag-over"); if (e.dataTransfer.files.length > 0) uploadResume(e.dataTransfer.files[0]); });

async function uploadResume(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) { showToast("Please upload a PDF file.", true); return; }
  dropZone.style.display = "none";
  resumeLoading.style.display = "flex";
  resumeAnalysis.style.display = "none";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/upload-resume`, { method: "POST", body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ detail: "Upload failed" })); throw new Error(err.detail); }
    const data = await res.json();

    // Store PDF blob for preview during interview
    resumeBlobUrl = URL.createObjectURL(file);
    resumeFileName = file.name;

    document.getElementById("analysis-file-name").textContent = file.name;
    document.getElementById("analysis-score-badge").textContent = data.analysis.overall_score + "/10";
    document.getElementById("analysis-summary").textContent = data.analysis.summary;
    renderScoreBars("resume-score-bars", data.analysis.scores);

    const sUl = document.getElementById("resume-strengths"); sUl.innerHTML = "";
    (data.analysis.strengths || []).forEach(s => { const li = document.createElement("li"); li.textContent = s; sUl.appendChild(li); });
    const iUl = document.getElementById("resume-improvements"); iUl.innerHTML = "";
    (data.analysis.improvements || []).forEach(s => { const li = document.createElement("li"); li.textContent = s; iUl.appendChild(li); });

    resumeLoading.style.display = "none";
    resumeAnalysis.style.display = "block";
    showToast("Resume analyzed! Click 'Start Interview' when ready.");
  } catch (err) {
    showToast("Error: " + err.message, true);
    resumeLoading.style.display = "none";
    dropZone.style.display = "block";
  }
}

// HELPERS
function renderScoreBars(containerId, scores) {
  const container = document.getElementById(containerId); container.innerHTML = "";
  for (const [key, value] of Object.entries(scores)) {
    const label = key.replace(/_/g, " ");
    const pct = (value / 10) * 100;
    const cls = value >= 7 ? "green" : value >= 5 ? "amber" : "red";
    const row = document.createElement("div");
    row.className = "score-bar-row";
    row.innerHTML = `<span class="score-bar-label">${label}</span><div class="score-bar-track"><div class="score-bar-fill ${cls}" style="width:0%"></div></div><span class="score-bar-value">${value}/10</span>`;
    container.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector(".score-bar-fill").style.width = pct + "%"; }));
  }
}

function setStatus(label, type = "ready") {
  statusText.textContent = label;
  statusBadge.className = "status-badge";
  concentricRings.className = "concentric-rings";
  if (type === "speaking") { statusBadge.classList.add("speaking"); concentricRings.classList.add("speaking"); }
  else if (type === "processing") { statusBadge.classList.add("processing"); }
}

function showToast(msg, isError = false) {
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " error" : "");
  t.textContent = msg;
  document.getElementById("toast-container").appendChild(t);
  setTimeout(() => { t.style.animation = "toast-out 0.3s ease forwards"; setTimeout(() => t.remove(), 300); }, 3500);
}

function addMessage(role, text) {
  const es = document.getElementById("empty-state"); if (es) es.remove();
  messageCount++;
  const tc = document.getElementById("transcript-count");
  if (tc) tc.textContent = messageCount + " messages";

  if (role === "ai") {
    questionCount++;
    const qc = document.getElementById("question-count");
    if (qc) qc.textContent = questionCount;
  }

  const msg = document.createElement("div"); msg.className = `message ${role}`;
  const av = document.createElement("div"); av.className = "msg-avatar"; av.textContent = role === "ai" ? "🧑‍💼" : "🧑";
  const bb = document.createElement("div"); bb.className = "msg-bubble"; bb.textContent = text;
  msg.appendChild(av); msg.appendChild(bb);
  transcriptScroll.appendChild(msg);
  transcriptScroll.scrollTop = transcriptScroll.scrollHeight;
}

function showTyping(show) {
  typingIndicator.className = show ? "typing-indicator visible" : "typing-indicator";
  if (show) transcriptScroll.scrollTop = transcriptScroll.scrollHeight;
}

function showProgress(pct) { progressWrap.classList.add("visible"); progressFill.style.width = pct + "%"; }
function hideProgress() { progressWrap.classList.remove("visible"); progressFill.style.width = "0%"; }

function playAudio(b64) {
  return new Promise((resolve) => {
    const a = new Audio("data:audio/mp3;base64," + b64);
    a.onended = resolve; a.onerror = resolve; a.play().catch(resolve);
  });
}

// Timer
function startTimer() {
  timerSeconds = 0; timerEl.classList.add("visible");
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m = Math.floor(timerSeconds / 60), s = timerSeconds % 60;
    timerEl.textContent = `⏺ ${m}:${s.toString().padStart(2, "0")}`;
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerEl.classList.remove("visible"); }

// Session timer
function startSessionTimer() {
  sessionSeconds = 0;
  sessionInterval = setInterval(() => {
    sessionSeconds++;
    const m = Math.floor(sessionSeconds / 60), s = sessionSeconds % 60;
    const el = document.getElementById("session-time");
    if (el) el.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 1000);
}

// Waveform
function startWaveform(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  waveLeft.classList.add("active");
  waveRight.classList.add("active");

  function draw() {
    analyserAnimId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(data);
    leftBars.forEach((bar, i) => { bar.style.height = Math.max(8, (data[i % data.length] / 255) * 44) + "px"; });
    rightBars.forEach((bar, i) => { bar.style.height = Math.max(8, (data[(BARS_PER_SIDE - 1 - i) % data.length] / 255) * 44) + "px"; });
  }
  draw();
}

function stopWaveform() {
  cancelAnimationFrame(analyserAnimId);
  waveLeft.classList.remove("active");
  waveRight.classList.remove("active");
  leftBars.forEach(b => b.style.height = "8px");
  rightBars.forEach(b => b.style.height = "8px");
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

// START INTERVIEW
async function startInterview() {
  const btn = document.getElementById("start-btn");
  btn.disabled = true; btn.textContent = "Connecting...";

  try {
    const res = await fetch(`${API_BASE}/start`, { method: "POST" });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    resumeSection.style.display = "none";
    interviewPhase.style.display = "block";

    // Show resume preview in left panel if uploaded
    if (resumeBlobUrl) {
      const preview = document.getElementById("resume-preview");
      const iframe = document.getElementById("resume-iframe");
      const nameEl = document.getElementById("resume-preview-name");
      if (preview && iframe) {
        iframe.src = resumeBlobUrl;
        preview.style.display = "block";
        if (nameEl) nameEl.textContent = resumeFileName;
      }
    }

    startSessionTimer();
    addMessage("ai", data.transcript);
    setStatus("Speaking…", "speaking");
    await playAudio(data.audio_b64);
    setStatus("Listening", "ready");
    enableRecord();
    hintText.textContent = "Click the mic button to record your answer.";
  } catch (err) {
    showToast("Could not connect to backend: " + err.message, true);
    btn.disabled = false; btn.textContent = "▶ Start Interview";
  }
}

function enableRecord() { recordBtn.classList.remove("disabled"); recordLabel.textContent = "Speak"; }
function disableRecord() { recordBtn.classList.add("disabled"); recordLabel.textContent = "Wait…"; }

// RECORDING
async function toggleRecord() {
  if (recordBtn.classList.contains("disabled")) return;
  if (!isRecording) await startRecording(); else stopRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/ogg;codecs=opus";
    mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); stopWaveform(); stopTimer(); await sendAudio(mime); };
    mediaRecorder.start(250);
    isRecording = true;
    recordBtn.classList.add("recording");
    recordIcon.textContent = "⏹";
    recordLabel.textContent = "Stop";
    micRing.classList.add("active");
    setStatus("Recording…", "processing");
    startTimer(); startWaveform(stream);
    hintText.textContent = "Recording… click again to stop and submit.";
  } catch { showToast("Microphone access denied.", true); }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  isRecording = false;
  recordBtn.classList.remove("recording");
  recordIcon.textContent = "🎙️";
  micRing.classList.remove("active");
  disableRecord();
}

async function sendAudio(mime) {
  showTyping(true); setStatus("Thinking…", "processing");
  hintText.textContent = "Alex is evaluating your answer…"; showProgress(20);
  const ext = mime.includes("ogg") ? "ogg" : "webm";
  const blob = new Blob(audioChunks, { type: mime });
  const fd = new FormData(); fd.append("audio", blob, `recording.${ext}`);

  try {
    showProgress(50);
    const res = await fetch(`${API_BASE}/respond`, { method: "POST", body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Server error");
    const data = await res.json();
    showProgress(90); showTyping(false);
    if (data.user_text) addMessage("user", data.user_text);
    addMessage("ai", data.ai_text);
    setStatus("Speaking…", "speaking"); showProgress(100);
    await playAudio(data.audio_b64);
    setStatus("Listening", "ready"); hideProgress(); enableRecord();
    hintText.textContent = "Click the mic to answer the next question.";
  } catch (err) {
    showTyping(false); showToast("Error: " + err.message, true);
    setStatus("Ready", "ready"); hideProgress(); enableRecord();
  }
}

// END INTERVIEW
async function endInterview() {
  const btn = document.getElementById("end-btn");
  btn.disabled = true; btn.textContent = "Generating scores...";
  if (isRecording) stopRecording();
  stopWaveform(); stopTimer(); clearInterval(sessionInterval);

  try {
    const res = await fetch(`${API_BASE}/end-interview`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Server error");
    const data = await res.json();

    interviewPhase.style.display = "none";
    scorecardPhase.style.display = "block";

    const iv = data.interview_score;
    document.getElementById("interview-big-score").textContent = iv.overall_score + "/10";
    document.getElementById("interview-summary").textContent = iv.summary;
    renderScoreBars("interview-score-bars", iv.scores);

    const vEl = document.getElementById("verdict-badge");
    vEl.textContent = iv.verdict;
    const v = (iv.verdict || "").toLowerCase();
    if (v.includes("strong hire") || v === "hire") vEl.className = "verdict-badge hire";
    else if (v.includes("lean hire")) vEl.className = "verdict-badge lean-hire";
    else if (v.includes("lean no")) vEl.className = "verdict-badge lean-no";
    else if (v.includes("no hire")) vEl.className = "verdict-badge no-hire";

    const iS = document.getElementById("interview-strengths"); iS.innerHTML = "";
    (iv.strengths || []).forEach(s => { const li = document.createElement("li"); li.textContent = s; iS.appendChild(li); });
    const iI = document.getElementById("interview-improvements"); iI.innerHTML = "";
    (iv.improvements || []).forEach(s => { const li = document.createElement("li"); li.textContent = s; iI.appendChild(li); });

    if (data.resume_score) {
      const rs = data.resume_score;
      document.getElementById("resume-score-section").style.display = "block";
      document.getElementById("resume-big-score").textContent = rs.overall_score + "/10";
      document.getElementById("resume-final-summary").textContent = rs.summary;
      renderScoreBars("resume-final-bars", rs.scores);
    }
  } catch (err) {
    showToast("Error: " + err.message, true);
    btn.disabled = false; btn.textContent = "🏁 End Interview & Get Score";
  }
}

function resetInterview() { location.reload(); }

// ══════════════ PRO MAX ENHANCEMENTS ══════════════

// 1. Synthetic Audio (Ticks & Pops)
const uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playUISound(type) {
  if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
  const osc = uiAudioCtx.createOscillator();
  const gain = uiAudioCtx.createGain();
  osc.connect(gain);
  gain.connect(uiAudioCtx.destination);
  
  if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, uiAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, uiAudioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, uiAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, uiAudioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(uiAudioCtx.currentTime + 0.05);
  } else if (type === 'pop') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, uiAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, uiAudioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, uiAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, uiAudioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(uiAudioCtx.currentTime + 0.1);
  }
}

// 2. Magnetic Buttons
document.querySelectorAll('.btn-primary, .record-btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
  btn.addEventListener('mouseenter', () => playUISound('tick'));
  btn.addEventListener('click', () => playUISound('pop'));
});
document.querySelectorAll('button:not(.btn-primary):not(.record-btn)').forEach(btn => {
  btn.addEventListener('mouseenter', () => playUISound('tick'));
});

// 3. Canvas Premium Particle Background
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let points = [];
function initCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  points = [];
  for (let i = 0; i < 60; i++) {
    points.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1
    });
  }
}
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
window.addEventListener('resize', initCanvas);

function animateCanvas() {
  requestAnimationFrame(animateCanvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Custom subtle gradients based on time
  const t = Date.now() * 0.0005;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `rgba(99, 102, 241, 0.08)`);
  gradient.addColorStop(0.5, `rgba(167, 139, 250, 0.04)`);
  gradient.addColorStop(1, `rgba(34, 211, 238, 0.08)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  points.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    
    // Mouse reaction
    const dx = mouseX - p.x;
    const dy = mouseY - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 150) {
      p.x -= dx * 0.01;
      p.y -= dy * 0.01;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(167, 139, 250, ${0.2 - dist/750})`;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}
initCanvas();
animateCanvas();
