"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const API_BASE = "http://127.0.0.1:8000";

/* ─── Types ─── */
type Phase = "resume" | "interview" | "scorecard";
interface Message { role: "ai" | "user"; text: string; isCode?: boolean; language?: string }
interface ScoreData {
  overall_score: number;
  scores: Record<string, number>;
  summary: string;
  strengths?: string[];
  improvements?: string[];
  verdict?: string;
}

/* ─── Score Bar Component ─── */
function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const cls = value >= 7 ? "bg-emerald-500" : value >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-sm text-on-surface-muted w-36 capitalize">{label.replace(/_/g, " ")}</span>
      <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${cls}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-sm text-on-surface font-bold w-12 text-right">{value}/10</span>
    </div>
  );
}

/* ─── Waveform Bar Component ─── */
function WaveformBars({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-11">
      {levels.map((l, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-accent/50 transition-all duration-75"
          style={{ height: active ? `${Math.max(8, l * 44)}px` : "8px" }}
        />
      ))}
    </div>
  );
}

/* ─── Code Languages ─── */
const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "", label: "Other" },
];

export default function InterviewPage() {
  /* ─── State ─── */
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [phase, setPhase] = useState<Phase>("resume");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [statusType, setStatusType] = useState<"ready" | "speaking" | "processing">("ready");
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<ScoreData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [interviewScore, setInterviewScore] = useState<ScoreData | null>(null);
  const [resumeFinalScore, setResumeFinalScore] = useState<ScoreData | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [waveLeft, setWaveLeft] = useState<number[]>(Array(18).fill(0));
  const [waveRight, setWaveRight] = useState<number[]>(Array(18).fill(0));
  const [hintText, setHintText] = useState("Upload your resume or start directly.");
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"fresher" | "junior" | "mid" | "senior">("junior");

  /* ─── Code Editor State ─── */
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [codeLang, setCodeLang] = useState("python");
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Refs ─── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animIdRef = useRef<number>(0);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const lineCountRef = useRef<HTMLDivElement>(null);

  /* ─── Toast ─── */
  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ─── Create Session on Mount ─── */
  const createNewSession = async (attempt = 1): Promise<void> => {
    setSessionError(false);
    try {
      const res = await fetch(`${API_BASE}/create-session`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.session_id);
      setSessionReady(true);
      console.log("Session created:", data.session_id);
    } catch (err) {
      console.error(`Session attempt ${attempt} failed:`, err);
      if (attempt < 3) {
        // Auto-retry up to 3 times with 2s delay
        await new Promise((r) => setTimeout(r, 2000));
        return createNewSession(attempt + 1);
      }
      // All retries exhausted — show error state
      setSessionError(true);
    }
  };

  useEffect(() => {
    createNewSession();
  }, []);

  /* ─── Reset Interview (no page reload) ─── */
  const handleReset = async () => {
    // Stop any active recording/timers
    if (isRecording) stopRecording();
    stopWaveform();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);

    // Reset all state
    setPhase("resume");
    setMessages([]);
    setQuestionCount(0);
    setSessionTime(0);
    setRecordTime(0);
    setResumeFile(null);
    setResumeAnalysis(null);
    setInterviewScore(null);
    setResumeFinalScore(null);
    setShowCodeEditor(false);
    setCodeText("");
    setCodeLang("python");
    setIsRecording(false);
    setIsProcessing(false);
    setIsEnding(false);
    setIsUploading(false);
    setIsStarting(false);
    setRecordEnabled(false);
    setStatus("Ready");
    setStatusType("ready");
    setHintText("Upload your resume or start directly.");
    setProgress(0);
    setShowProgress(false);
    setTargetRole("");
    setTargetCompany("");
    setExperienceLevel("junior");
    setWaveLeft(Array(18).fill(0));
    setWaveRight(Array(18).fill(0));

    // Create a fresh session
    await createNewSession();
  };

  /* ─── Session Timer ─── */
  useEffect(() => {
    if (phase === "interview") {
      sessionTimerRef.current = setInterval(() => setSessionTime((t) => t + 1), 1000);
      return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }
  }, [phase]);

  /* ─── Auto─scroll transcript ─── */
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  /* ─── Play audio from base64 ─── */
  const playAudio = (b64: string): Promise<void> =>
    new Promise((resolve) => {
      const a = new Audio("data:audio/mp3;base64," + b64);
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });

  /* ─── Resume Upload ─── */
  const handleResumeUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please upload a PDF file.", true);
      return;
    }
    if (!sessionId) {
      showToast("Session not ready. Please wait...", true);
      return;
    }
    setResumeFile(file);
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("session_id", sessionId);
    try {
      const res = await fetch(`${API_BASE}/upload-resume`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setResumeAnalysis(data.analysis);
      showToast("Resume analyzed! Click 'Start Interview' when ready.");
    } catch (err: any) {
      showToast("Error: " + err.message, true);
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  /* ─── Start Interview ─── */
  const handleStartInterview = async () => {
    if (!targetRole.trim()) {
      showToast("Please enter the role you are applying for.", true);
      return;
    }
    if (!sessionId) {
      showToast("Session not ready. Please wait...", true);
      return;
    }
    setIsStarting(true);
    try {
      const res = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          role: targetRole.trim() || "Software Engineer",
          company: targetCompany.trim() || "a top-tier tech company",
          level: experienceLevel,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPhase("interview");
      setMessages([{ role: "ai", text: data.transcript }]);
      setQuestionCount(1);
      setStatus("Speaking…");
      setStatusType("speaking");
      await playAudio(data.audio_b64);
      setStatus("Listening");
      setStatusType("ready");
      setRecordEnabled(true);
      setHintText("Click the mic button to record your answer, or </> to type code.");
    } catch (err: any) {
      showToast("Could not connect to backend: " + err.message, true);
    } finally {
      setIsStarting(false);
    }
  };

  /* ─── Waveform ─── */
  const startWaveform = (stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      animIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const left = Array.from({ length: 18 }, (_, i) => (data[i % data.length] || 0) / 255);
      const right = Array.from({ length: 18 }, (_, i) => (data[(17 - i) % data.length] || 0) / 255);
      setWaveLeft(left);
      setWaveRight(right);
    };
    draw();
  };

  const stopWaveform = () => {
    cancelAnimationFrame(animIdRef.current);
    setWaveLeft(Array(18).fill(0));
    setWaveRight(Array(18).fill(0));
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
  };

  /* ─── Recording ─── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/ogg;codecs=opus";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopWaveform();
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        await sendAudio(mime);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      setStatus("Recording…");
      setStatusType("processing");
      startWaveform(stream);
      setHintText("Recording… click again to stop and submit.");
    } catch {
      showToast("Microphone access denied.", true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordEnabled(false);
  };

  const toggleRecord = () => {
    if (!recordEnabled) return;
    if (!isRecording) startRecording();
    else stopRecording();
  };

  /* ─── Send Code/Text ─── */
  const sendCodeSubmission = async () => {
    if (!codeText.trim() || isProcessing) return;
    setIsProcessing(true);
    setShowProgress(true);
    setProgress(20);
    setStatus("Reviewing code…");
    setStatusType("processing");
    setHintText("Alex is reviewing your code…");
    setRecordEnabled(false);

    try {
      setProgress(50);
      const res = await fetch(`${API_BASE}/respond-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          text: codeText.trim(),
          is_code: true,
          language: codeLang,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Server error");
      const data = await res.json();
      setProgress(90);
      if (data.user_text) setMessages((m) => [...m, { role: "user", text: data.user_text, isCode: true, language: codeLang }]);
      setMessages((m) => [...m, { role: "ai", text: data.ai_text }]);
      setQuestionCount((q) => q + 1);
      setStatus("Speaking…");
      setStatusType("speaking");
      setProgress(100);
      await playAudio(data.audio_b64);
      setStatus("Listening");
      setStatusType("ready");
      setRecordEnabled(true);
      setShowCodeEditor(false);
      setCodeText("");
      setHintText("Click the mic to answer or </> to write code.");
    } catch (err: any) {
      showToast("Error: " + err.message, true);
      setStatus("Ready");
      setStatusType("ready");
      setRecordEnabled(true);
    } finally {
      setIsProcessing(false);
      setShowProgress(false);
      setProgress(0);
    }
  };

  /* ─── Code editor line sync ─── */
  const syncScroll = () => {
    if (codeTextareaRef.current && lineCountRef.current) {
      lineCountRef.current.scrollTop = codeTextareaRef.current.scrollTop;
    }
  };

  const codeLineCount = codeText.split("\n").length;

  /* ─── Send Audio ─── */
  const sendAudio = async (mime: string) => {
    setIsProcessing(true);
    setShowProgress(true);
    setProgress(20);
    setStatus("Thinking…");
    setStatusType("processing");
    setHintText("Alex is evaluating your answer…");

    const ext = mime.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob(audioChunksRef.current, { type: mime });
    const fd = new FormData();
    fd.append("audio", blob, `recording.${ext}`);
    fd.append("session_id", sessionId);

    try {
      setProgress(50);
      const res = await fetch(`${API_BASE}/respond`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Server error");
      const data = await res.json();
      setProgress(90);
      if (data.user_text) setMessages((m) => [...m, { role: "user", text: data.user_text }]);
      setMessages((m) => [...m, { role: "ai", text: data.ai_text }]);
      setQuestionCount((q) => q + 1);
      setStatus("Speaking…");
      setStatusType("speaking");
      setProgress(100);
      await playAudio(data.audio_b64);
      setStatus("Listening");
      setStatusType("ready");
      setRecordEnabled(true);
      setHintText("Click the mic to answer or </> to write code.");
    } catch (err: any) {
      showToast("Error: " + err.message, true);
      setStatus("Ready");
      setStatusType("ready");
      setRecordEnabled(true);
    } finally {
      setIsProcessing(false);
      setShowProgress(false);
      setProgress(0);
    }
  };

  /* ─── End Interview ─── */
  const handleEndInterview = async () => {
    setIsEnding(true);
    if (isRecording) stopRecording();
    stopWaveform();
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);

    try {
      const res = await fetch(`${API_BASE}/end-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Server error");
      const data = await res.json();
      setInterviewScore(data.interview_score);
      if (data.resume_score) setResumeFinalScore(data.resume_score);
      setPhase("scorecard");
    } catch (err: any) {
      showToast("Error: " + err.message, true);
    } finally {
      setIsEnding(false);
    }
  };

  /* ─── Verdict badge color ─── */
  const getVerdictClass = (verdict?: string) => {
    const v = (verdict || "").toLowerCase();
    if (v.includes("strong hire") || v === "hire") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v.includes("lean hire")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (v.includes("lean no")) return "bg-orange-50 text-orange-700 border-orange-200";
    if (v.includes("no hire")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-stone-50 text-stone-600 border-stone-200";
  };

  /* ─── Status dot color ─── */
  const statusDot = statusType === "speaking" ? "bg-emerald-400 animate-pulse" : statusType === "processing" ? "bg-amber-400 animate-pulse" : "bg-emerald-500";

  /* ════════════════════ RENDER ════════════════════ */

  /* Loading screen while connecting to backend */
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-lowest">
        <div className="text-center max-w-sm px-6">
          {sessionError ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-3xl mx-auto mb-5">⚠️</div>
              <h2 className="text-on-surface font-manrope font-bold text-xl mb-2">Cannot Reach Backend</h2>
              <p className="text-on-surface-muted text-sm mb-6">
                Make sure the backend server is running on{" "}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">http://127.0.0.1:8000</code>
              </p>
              <p className="text-on-surface-faint text-xs mb-6">
                Run: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">venv\Scripts\uvicorn backend.main:app --reload</code>
              </p>
              <button
                onClick={() => createNewSession()}
                className="px-6 py-3 bg-gradient-to-br from-accent to-violet-accent text-white rounded-full font-bold text-sm shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                🔄 Retry Connection
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <h2 className="text-on-surface font-manrope font-bold text-lg mb-2">Connecting to Interview Server</h2>
              <p className="text-on-surface-faint text-sm">Setting up your session...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-lowest text-on-surface">

      {/* Soft background orbs */}
      <div className="orb w-[600px] h-[600px] bg-indigo-100/50 top-[-180px] left-[-200px] fixed" />
      <div className="orb w-[500px] h-[500px] bg-violet-100/40 top-[-100px] right-[-180px] fixed" />

      {/* ── Top Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-stone-200/60">
        <div className="flex justify-between items-center px-6 md:px-8 py-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-sm text-white shadow-lg shadow-accent/20">🎯</div>
            <span className="text-lg font-manrope font-bold tracking-tight text-on-surface hidden sm:block">Mock Interview Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            {targetRole && (
              <span className="bg-indigo-50 text-accent border border-indigo-100 px-3 py-1 rounded-full text-xs font-semibold hidden md:inline">
                {targetRole}{targetCompany ? ` @ ${targetCompany}` : ""}
              </span>
            )}
            <span className={`text-sm font-semibold ${phase === "resume" ? "text-accent" : "text-on-surface-faint"}`}>Setup</span>
            <span className="text-stone-300">→</span>
            <span className={`text-sm font-semibold ${phase === "interview" ? "text-accent" : "text-on-surface-faint"}`}>Interview</span>
            <span className="text-stone-300">→</span>
            <span className={`text-sm font-semibold ${phase === "scorecard" ? "text-accent" : "text-on-surface-faint"}`}>Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-xs text-on-surface-faint">Connected</span>
          </div>
        </div>
      </nav>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-full text-sm font-medium backdrop-blur-xl border card-shadow ${
              toast.error ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-20 pb-8 max-w-7xl mx-auto px-6">
        <AnimatePresence mode="wait">

          {/* ════════ PHASE 1: RESUME UPLOAD ════════ */}
          {phase === "resume" && (
            <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Hero */}
              <div className="text-center mt-8 mb-10">
                <div className="inline-flex items-center gap-2 bg-white/80 border border-stone-200 px-4 py-1.5 rounded-full mb-6 card-shadow backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-accent text-xs font-semibold">AI Powered · Real-time Feedback</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-3">Mock Interview Studio</h1>
                <p className="text-on-surface-muted text-lg max-w-2xl mx-auto">
                  Upload your resume, practice technical interviews, and get scored by an AI interviewer powered by Google Gemini.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: "🎙️", title: "Voice Interview", desc: "Speak naturally — Alex listens, evaluates, and responds in real-time.", bg: "bg-indigo-50", iconBg: "bg-indigo-100" },
                  { icon: "📄", title: "Resume Tailored", desc: "Upload your resume for questions based on your actual experience.", bg: "bg-violet-50", iconBg: "bg-violet-100" },
                  { icon: "📊", title: "Detailed Scoring", desc: "Get a scorecard with strengths, improvements, and a hire verdict.", bg: "bg-emerald-50", iconBg: "bg-emerald-100" },
                ].map((f) => (
                  <div key={f.title} className="bg-white border border-stone-100 rounded-2xl p-6 text-center card-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all">
                    <div className={`w-14 h-14 rounded-xl ${f.iconBg} flex items-center justify-center text-2xl mx-auto mb-3`}>{f.icon}</div>
                    <h3 className="text-on-surface font-manrope font-bold mb-1">{f.title}</h3>
                    <p className="text-on-surface-muted text-sm">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Resume Upload Card */}
              <div className="bg-white border border-stone-100 rounded-3xl p-8 max-w-2xl mx-auto card-shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-on-surface font-manrope font-bold text-lg">📄 Resume Upload</h2>
                    <p className="text-on-surface-faint text-sm">Optional — upload to get tailored questions & a resume score</p>
                  </div>
                </div>

                {!resumeFile && !isUploading && (
                  <label className="block border-2 border-dashed border-stone-200 hover:border-accent/40 rounded-2xl p-10 text-center cursor-pointer transition-colors group">
                    <div className="text-4xl mb-3">📎</div>
                    <p className="text-on-surface font-medium">Drag & drop your resume (PDF) here</p>
                    <p className="text-on-surface-faint text-sm mt-1">or click to browse files</p>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                    />
                  </label>
                )}

                {isUploading && (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-on-surface-muted">Analyzing your resume with AI...</p>
                  </div>
                )}

                {resumeAnalysis && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface text-sm">{resumeFile?.name}</span>
                      <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-bold">{resumeAnalysis.overall_score}/10</span>
                    </div>
                    <p className="text-on-surface-muted text-sm">{resumeAnalysis.summary}</p>
                    <div>
                      {Object.entries(resumeAnalysis.scores || {}).map(([k, v]) => (
                        <ScoreBar key={k} label={k} value={v} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <h4 className="text-emerald-700 text-sm font-bold mb-2">✅ Strengths</h4>
                        <ul className="text-on-surface-muted text-sm space-y-1">
                          {(resumeAnalysis.strengths || []).map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <h4 className="text-amber-700 text-sm font-bold mb-2">🔧 Improvements</h4>
                        <ul className="text-on-surface-muted text-sm space-y-1">
                          {(resumeAnalysis.improvements || []).map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Role & Company Inputs ── */}
                <div className="mt-6 space-y-3">
                  <div>
                    <label className="block text-on-surface text-sm font-semibold mb-1.5">
                      🎯 Role you&apos;re applying for <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Software Engineer, Product Manager, Data Scientist"
                      className="w-full bg-surface-lowest border border-stone-200 hover:border-accent/40 focus:border-accent text-on-surface placeholder-on-surface-faint rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface text-sm font-semibold mb-1.5">
                      🏢 Company <span className="text-on-surface-faint font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Google, Meta, Stripe (leave blank for generic)"
                      className="w-full bg-surface-lowest border border-stone-200 hover:border-accent/40 focus:border-accent text-on-surface placeholder-on-surface-faint rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* ── Experience Level Selector ── */}
                <div className="mt-4">
                  <label className="block text-on-surface text-sm font-semibold mb-2.5">
                    📈 Your experience level
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "fresher", label: "Fresher",  sub: "0–1 yr",  emoji: "🌱" },
                      { key: "junior",  label: "Junior",   sub: "1–3 yr",  emoji: "🚀" },
                      { key: "mid",     label: "Mid",      sub: "3–5 yr",  emoji: "⚡" },
                      { key: "senior",  label: "Senior",   sub: "5+ yr",   emoji: "👑" },
                    ] as const).map((lvl) => (
                      <button
                        key={lvl.key}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.key)}
                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all duration-200 ${
                          experienceLevel === lvl.key
                            ? "bg-accent/10 border-accent shadow-[0_0_0_1px_rgba(79,70,229,0.3)]"
                            : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-xl">{lvl.emoji}</span>
                        <span className={`text-xs font-bold ${experienceLevel === lvl.key ? "text-accent" : "text-on-surface"}`}>
                          {lvl.label}
                        </span>
                        <span className="text-[10px] text-on-surface-faint">{lvl.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview chip */}
                {targetRole && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-muted flex-wrap">
                    <span className="bg-indigo-50 text-accent border border-indigo-100 px-3 py-1 rounded-full font-medium">
                      {targetRole}{targetCompany ? ` @ ${targetCompany}` : ""}
                    </span>
                    <span className="bg-stone-50 text-on-surface-muted border border-stone-200 px-3 py-1 rounded-full font-medium capitalize">
                      {experienceLevel} level
                    </span>
                    <span>← Alex adapts to this</span>
                  </div>
                )}

                <button
                  onClick={handleStartInterview}
                  disabled={isStarting || !targetRole.trim()}
                  className="w-full mt-5 py-4 bg-gradient-to-br from-accent to-violet-accent text-white rounded-full font-bold text-lg shadow-[0_6px_28px_rgba(79,70,229,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isStarting ? "Connecting..." : `▶ Start Interview${targetRole ? ` — ${targetRole}` : ""}`}
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ PHASE 2: INTERVIEW ════════ */}
          {phase === "interview" && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-[320px_1fr] gap-6 mt-4" style={{ height: "calc(100vh - 220px)" }}>

                {/* LEFT — Interviewer Panel */}
                <div className="bg-white border border-stone-100 rounded-3xl p-6 flex flex-col items-center text-center card-shadow-lg">
                  {/* Avatar with rings */}
                  <div className="relative w-28 h-28 mb-4">
                    {[1, 2, 3].map((r) => (
                      <div
                        key={r}
                        className={`absolute inset-0 rounded-full border ${
                          statusType === "speaking" ? "border-emerald-300/40 animate-ping" : "border-indigo-200/30"
                        }`}
                        style={{ transform: `scale(${1 + r * 0.2})`, animationDelay: `${r * 0.3}s`, animationDuration: "2s" }}
                      />
                    ))}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-4xl shadow-lg shadow-accent/20">
                      🧑‍💼
                    </div>
                  </div>
                  <h2 className="text-on-surface font-manrope font-bold text-lg">Alex Chen</h2>
                  <p className="text-on-surface-faint text-sm mb-1">Senior Technical Interviewer</p>
                  {(targetRole || targetCompany) && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-2 text-center">
                      {targetRole && <p className="text-accent text-xs font-bold">{targetRole}</p>}
                      {targetCompany && <p className="text-on-surface-faint text-xs">@ {targetCompany}</p>}
                    </div>
                  )}
                  <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mb-3 text-center">
                    <p className="text-on-surface text-xs font-medium capitalize">
                      {{ fresher: "🌱 Fresher", junior: "🚀 Junior", mid: "⚡ Mid-level", senior: "👑 Senior" }[experienceLevel]} · {
                        { fresher: "0–1 yr", junior: "1–3 yr", mid: "3–5 yr", senior: "5+ yr" }[experienceLevel]
                      }
                    </p>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    statusType === "speaking" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : statusType === "processing" ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-stone-50 text-on-surface-muted border-stone-200"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    {status}
                  </div>

                  {/* Session Stats */}
                  <div className="flex gap-6 mt-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-on-surface">{questionCount}</div>
                      <div className="text-xs text-on-surface-faint">Questions</div>
                    </div>
                    <div className="w-px bg-stone-200" />
                    <div>
                      <div className="text-2xl font-bold text-on-surface">{formatTime(sessionTime)}</div>
                      <div className="text-xs text-on-surface-faint">Duration</div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Transcript */}
                <div className="bg-white border border-stone-100 rounded-3xl flex flex-col overflow-hidden card-shadow-lg">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100">
                    <span className="text-on-surface font-manrope font-bold">💬 Live Transcript</span>
                    <span className="text-on-surface-faint text-sm">{messages.length} messages</span>
                  </div>
                  <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                          m.role === "ai" 
                            ? "bg-gradient-to-br from-accent to-violet-accent text-white shadow-md" 
                            : "bg-stone-100 border border-stone-200"
                        }`}>
                          {m.role === "ai" ? "🧑‍💼" : "🧑"}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === "ai" 
                            ? "bg-stone-50 border border-stone-100 text-on-surface" 
                            : "bg-indigo-50 text-indigo-900 border border-indigo-100"
                        }`}>
                          {m.isCode ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Code</span>
                                {m.language && <span className="text-on-surface-faint text-xs">{m.language}</span>}
                              </div>
                              <pre className="bg-slate-900 rounded-lg p-3 overflow-x-auto text-xs font-mono text-emerald-300 border border-slate-700 whitespace-pre-wrap break-all">{m.text}</pre>
                            </div>
                          ) : (
                            m.text
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isProcessing && (
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-sm text-white shadow-md">🧑‍💼</div>
                        <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 flex gap-1">
                          {[0, 1, 2].map((d) => (
                            <div key={d} className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.2}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Code Editor Panel ─── */}
              <AnimatePresence>
                {showCodeEditor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="bg-white border border-stone-100 rounded-3xl overflow-hidden card-shadow-lg">
                      {/* Editor Header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-manrope font-bold text-on-surface">💻 Code Editor</span>
                          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Live
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Language Selector */}
                          <select
                            value={codeLang}
                            onChange={(e) => setCodeLang(e.target.value)}
                            className="bg-white border border-stone-200 text-on-surface text-xs rounded-lg px-3 py-1.5 outline-none focus:border-accent transition-colors cursor-pointer"
                          >
                            {CODE_LANGUAGES.map((l) => (
                              <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                          </select>
                          {/* Line count */}
                          <span className="text-on-surface-faint text-xs font-mono">
                            {codeLineCount} {codeLineCount === 1 ? "line" : "lines"}
                          </span>
                          {/* Close btn */}
                          <button
                            onClick={() => setShowCodeEditor(false)}
                            className="text-on-surface-faint hover:text-on-surface transition-colors text-lg leading-none"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Editor Body — dark themed for readability */}
                      <div className="flex" style={{ height: "280px" }}>
                        {/* Line Numbers */}
                        <div
                          ref={lineCountRef}
                          className="bg-slate-900 text-slate-500 text-xs font-mono py-4 px-3 text-right select-none overflow-hidden border-r border-slate-700"
                          style={{ minWidth: "48px" }}
                        >
                          {Array.from({ length: codeLineCount }, (_, i) => (
                            <div key={i + 1} className="leading-[1.65rem]">{i + 1}</div>
                          ))}
                        </div>

                        {/* Code Textarea */}
                        <textarea
                          ref={codeTextareaRef}
                          value={codeText}
                          onChange={(e) => setCodeText(e.target.value)}
                          onScroll={syncScroll}
                          onKeyDown={(e) => {
                            // Ctrl+Enter submits code
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              sendCodeSubmission();
                              return;
                            }
                            // Tab key inserts spaces instead of moving focus
                            if (e.key === "Tab") {
                              e.preventDefault();
                              const start = e.currentTarget.selectionStart;
                              const end = e.currentTarget.selectionEnd;
                              const val = e.currentTarget.value;
                              setCodeText(val.substring(0, start) + "    " + val.substring(end));
                              setTimeout(() => {
                                if (codeTextareaRef.current) {
                                  codeTextareaRef.current.selectionStart = codeTextareaRef.current.selectionEnd = start + 4;
                                }
                              }, 0);
                            }
                          }}
                          placeholder={`// Write your ${CODE_LANGUAGES.find(l => l.value === codeLang)?.label || ''} code here...\n// Use Tab for indentation\n// Press Ctrl+Enter or click Submit to send`}
                          className="flex-1 bg-slate-900 text-emerald-300 text-sm font-mono p-4 outline-none resize-none leading-[1.65rem] placeholder-slate-600 caret-indigo-400"
                          spellCheck={false}
                          autoCapitalize="off"
                          autoCorrect="off"
                        />
                      </div>

                      {/* Editor Footer */}
                      <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-2 text-on-surface-faint text-xs">
                          <kbd className="bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-mono">Tab</kbd>
                          <span>indent</span>
                          <span className="mx-1 text-stone-300">·</span>
                          <kbd className="bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
                          <span>submit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setCodeText(""); codeTextareaRef.current?.focus(); }}
                            className="px-4 py-2 bg-white text-on-surface-muted border border-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-all"
                          >
                            Clear
                          </button>
                          <button
                            onClick={sendCodeSubmission}
                            disabled={!codeText.trim() || isProcessing}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "Submitting…" : "▶ Submit Code"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Controls */}
              <div className="mt-6">
                {/* Waveform + Mic + Code Toggle */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <WaveformBars levels={waveLeft} active={isRecording} />
                  <button
                    onClick={toggleRecord}
                    disabled={!recordEnabled || showCodeEditor}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-xl ${
                      isRecording
                        ? "bg-red-500 shadow-red-500/30 animate-pulse text-white"
                        : recordEnabled && !showCodeEditor
                        ? "bg-gradient-to-br from-accent to-violet-accent shadow-accent/25 hover:scale-110 text-white"
                        : "bg-stone-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isRecording ? "⏹" : "🎙️"}
                  </button>

                  {/* Code Editor Toggle Button */}
                  <button
                    onClick={() => {
                      setShowCodeEditor(!showCodeEditor);
                      if (!showCodeEditor) {
                        setTimeout(() => codeTextareaRef.current?.focus(), 300);
                      }
                    }}
                    disabled={isRecording || isProcessing}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg font-mono font-bold ${
                      showCodeEditor
                        ? "bg-emerald-500 shadow-emerald-500/25 ring-2 ring-emerald-300/30 text-white"
                        : recordEnabled && !isRecording
                        ? "bg-white border-2 border-stone-200 shadow-stone-200/20 hover:scale-110 hover:border-accent/50 text-on-surface-muted"
                        : "bg-stone-200 opacity-50 cursor-not-allowed text-stone-400"
                    }`}
                    title={showCodeEditor ? "Close code editor" : "Open code editor"}
                  >
                    {showCodeEditor ? "✕" : "</>"}
                  </button>

                  <WaveformBars levels={waveRight} active={isRecording} />
                </div>

                {/* Timer + Hint */}
                {isRecording && (
                  <div className="text-center text-red-500 text-sm font-mono animate-pulse mb-2">
                    ⏺ {formatTime(recordTime)}
                  </div>
                )}
                {showProgress && (
                  <div className="max-w-md mx-auto h-1.5 bg-stone-100 rounded-full overflow-hidden mb-2">
                    <motion.div className="h-full bg-accent rounded-full" animate={{ width: `${progress}%` }} />
                  </div>
                )}
                <p className="text-center text-on-surface-faint text-sm mb-4">{hintText}</p>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleEndInterview}
                    disabled={isEnding}
                    className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    {isEnding ? "Generating scores..." : "🏁 End Interview & Get Score"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-white text-on-surface-muted border border-stone-200 rounded-full text-sm font-semibold hover:bg-stone-50 transition-all"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ PHASE 3: SCORECARD ════════ */}
          {phase === "scorecard" && interviewScore && (
            <motion.div key="scorecard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <div className="bg-white border border-stone-100 rounded-3xl p-8 max-w-3xl mx-auto card-shadow-lg">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-manrope font-extrabold text-on-surface mb-2">📊 Interview Scorecard</h2>
                  <p className="text-on-surface-muted">Here&apos;s how you performed in this mock interview session.</p>
                </div>

                {/* Interview Score */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-on-surface font-manrope font-bold text-lg">🎤 Interview Performance</h3>
                    <span className="text-3xl font-extrabold text-on-surface">{interviewScore.overall_score}/10</span>
                  </div>
                  {interviewScore.verdict && (
                    <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-bold border mb-4 ${getVerdictClass(interviewScore.verdict)}`}>
                      {interviewScore.verdict}
                    </div>
                  )}
                  <p className="text-on-surface-muted text-sm mb-6">{interviewScore.summary}</p>
                  {Object.entries(interviewScore.scores || {}).map(([k, v]) => (
                    <ScoreBar key={k} label={k} value={v} />
                  ))}
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h4 className="text-emerald-700 text-sm font-bold mb-2">✅ Strengths</h4>
                      <ul className="text-on-surface-muted text-sm space-y-1">
                        {(interviewScore.strengths || []).map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <h4 className="text-amber-700 text-sm font-bold mb-2">🔧 Areas to Improve</h4>
                      <ul className="text-on-surface-muted text-sm space-y-1">
                        {(interviewScore.improvements || []).map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Resume Score (if available) */}
                {resumeFinalScore && (
                  <div className="border-t border-stone-100 pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-on-surface font-manrope font-bold text-lg">📄 Resume Score</h3>
                      <span className="text-3xl font-extrabold text-on-surface">{resumeFinalScore.overall_score}/10</span>
                    </div>
                    <p className="text-on-surface-muted text-sm mb-6">{resumeFinalScore.summary}</p>
                    {Object.entries(resumeFinalScore.scores || {}).map(([k, v]) => (
                      <ScoreBar key={k} label={k} value={v} />
                    ))}
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="w-full mt-8 py-4 bg-gradient-to-br from-accent to-violet-accent text-white rounded-full font-bold text-lg shadow-[0_6px_28px_rgba(79,70,229,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  🔄 Start New Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-on-surface-faint text-sm border-t border-stone-100">
        Powered by Google Gemini · OpenAI Whisper · Edge TTS
      </footer>
    </div>
  );
}
