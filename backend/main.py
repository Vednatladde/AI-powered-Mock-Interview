"""
backend/main.py - FastAPI backend for the AI Mock Interviewer.

Multi-user session support: each user gets a unique session_id.
All state is isolated per session — multiple users can interview simultaneously.

Endpoints:
  POST /create-session   - Create a new session (returns session_id)
  POST /upload-resume    - Upload a PDF resume for analysis
  POST /analyze-role-fit - Analyze resume fit for a specific role
  POST /start            - Start a new interview session
  POST /respond          - Send user audio, get next question
  POST /respond-text     - Send user text/code, get next question
  POST /end-interview    - End the interview and get final scores
  GET  /                 - Serves the frontend
"""

import sys
import os
import asyncio
import traceback
import logging
import uuid
import time
import threading

# Dynamic FFmpeg detection (replaces hardcoded WinGet path)
from backend.ffmpeg_setup import ensure_ffmpeg
ensure_ffmpeg()

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.llm import InterviewSession, analyze_resume, analyze_resume_for_role
from backend.stt import transcribe_audio, init_whisper
from backend.tts import synthesize_speech
from backend.resume import extract_resume_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("interview")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AI Mock Interviewer API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — scoped to known frontends (configurable via CORS_ORIGINS env var)
_allowed_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:8000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize background services on server startup."""
    init_whisper()  # Load Whisper model in background thread
    logger.info("Server started. Whisper loading in background.")


# ─── Session Store ───
# Each session holds all state for one user
class UserSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = time.time()
        self.last_active = time.time()
        self.interview: InterviewSession | None = None
        self.resume_text: str = ""
        self.resume_analysis: dict | None = None
        self.target_role: str = ""
        self.target_company: str = ""

    def touch(self):
        """Update last active timestamp."""
        self.last_active = time.time()


# Thread-safe session store
_sessions: dict[str, UserSession] = {}
_sessions_lock = threading.Lock()

SESSION_TIMEOUT_SECONDS = 3600  # 1 hour


def _get_session(session_id: str) -> UserSession:
    """Retrieve a session by ID or raise 404."""
    with _sessions_lock:
        session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found. Create a new session first.")
    session.touch()
    return session


def _cleanup_expired_sessions():
    """Remove sessions older than the timeout."""
    now = time.time()
    with _sessions_lock:
        expired = [sid for sid, s in _sessions.items() if now - s.last_active > SESSION_TIMEOUT_SECONDS]
        for sid in expired:
            del _sessions[sid]
            logger.info(f"Cleaned up expired session: {sid}")


# ─── Request Models ───

class StartRequest(BaseModel):
    session_id: str
    role: str = "Software Engineer"
    company: str = "a top-tier tech company"
    level: str = "junior"  # fresher | junior | mid | senior


class TextRequest(BaseModel):
    session_id: str
    text: str
    is_code: bool = False
    language: str = ""


class RoleFitRequest(BaseModel):
    session_id: str
    role: str
    company: str = ""


class EndRequest(BaseModel):
    session_id: str


# ─── Helpers ───

async def _text_to_audio_b64(text: str) -> str:
    """Convert text to MP3 and return as base64 string. Fully async."""
    audio_bytes = await synthesize_speech(text)
    return base64.b64encode(audio_bytes).decode("utf-8")


# ─── Endpoints ───

@app.post("/create-session")
@limiter.limit("10/minute")
async def create_session(request: Request):
    """
    Create a new isolated user session.
    Returns: { session_id: str }
    """
    # Clean up old sessions periodically
    _cleanup_expired_sessions()

    session_id = str(uuid.uuid4())
    session = UserSession(session_id)
    with _sessions_lock:
        _sessions[session_id] = session
    logger.info(f"Created new session: {session_id} (total active: {len(_sessions)})")
    return JSONResponse({"session_id": session_id})


@app.post("/upload-resume")
@limiter.limit("5/minute")
async def upload_resume(request: Request, file: UploadFile = File(...), session_id: str = Form(...)):
    """
    Upload a PDF resume. Extracts text and sends to Gemini for analysis.
    Returns: { resume_text: str, analysis: { scores, strengths, improvements, summary } }
    """
    session = _get_session(session_id)
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Please upload a PDF file.")

        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file received.")

        logger.info(f"[{session_id[:8]}] Received resume: {file.filename} ({len(pdf_bytes)} bytes)")

        # Extract text (sync — run in thread pool)
        session.resume_text = await asyncio.to_thread(extract_resume_text, pdf_bytes)
        if not session.resume_text:
            raise HTTPException(status_code=422, detail="Could not extract text from PDF. Is the file scanned/image-based?")

        logger.info(f"[{session_id[:8]}] Extracted {len(session.resume_text)} chars from resume. Analyzing...")

        # Analyze resume with Gemini (sync — run in thread pool)
        session.resume_analysis = await asyncio.to_thread(analyze_resume, session.resume_text)
        logger.info(f"[{session_id[:8]}] Resume analysis complete. Score: {session.resume_analysis.get('overall_score')}/10")

        return JSONResponse({
            "resume_text": session.resume_text[:500] + "..." if len(session.resume_text) > 500 else session.resume_text,
            "analysis": session.resume_analysis,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{session_id[:8]}] Error in /upload-resume: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-role-fit")
@limiter.limit("10/minute")
async def analyze_role_fit(request: Request, body: RoleFitRequest):
    """
    Analyze the uploaded resume for a specific role.
    Requires resume to be uploaded first via /upload-resume.
    Returns: { analysis: { scores, matching_skills, missing_skills, strengths, improvements, summary } }
    """
    session = _get_session(body.session_id)
    if not session.resume_text:
        raise HTTPException(status_code=400, detail="No resume uploaded. Please upload a resume first.")

    if not body.role.strip():
        raise HTTPException(status_code=400, detail="Role is required for role-fit analysis.")

    try:
        logger.info(f"[{body.session_id[:8]}] Analyzing resume for role='{body.role}' company='{body.company}'")
        # Gemini call is sync — run in thread pool
        role_analysis = await asyncio.to_thread(
            analyze_resume_for_role,
            session.resume_text,
            body.role.strip(),
            body.company.strip(),
        )
        logger.info(f"[{body.session_id[:8]}] Role-fit analysis complete. Score: {role_analysis.get('overall_score')}/10")
        return JSONResponse({"analysis": role_analysis})
    except Exception as e:
        logger.error(f"[{body.session_id[:8]}] Error in /analyze-role-fit: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/start")
@limiter.limit("10/minute")
async def start_interview(request: Request, body: StartRequest):
    """
    Starts a fresh interview session for a specific role and company.
    Returns: { transcript: str, audio_b64: str }
    """
    session = _get_session(body.session_id)
    session.target_role = body.role.strip() or "Software Engineer"
    session.target_company = body.company.strip() or "a top-tier tech company"
    _level = body.level.strip() or "junior"
    try:
        logger.info(f"[{body.session_id[:8]}] Starting interview for role='{session.target_role}' company='{session.target_company}' level='{_level}' resume={'yes' if session.resume_text else 'no'}")
        # InterviewSession init + start() are sync (Gemini) — run in thread pool
        def _create_and_start():
            iv = InterviewSession(
                resume_text=session.resume_text,
                role=session.target_role,
                company=session.target_company,
                level=_level,
            )
            return iv, iv.start()

        session.interview, intro_text = await asyncio.to_thread(_create_and_start)
        logger.info(f"[{body.session_id[:8]}] LLM intro received ({len(intro_text)} chars). Generating TTS...")
        audio_b64 = await _text_to_audio_b64(intro_text)
        logger.info(f"[{body.session_id[:8]}] TTS done. Returning response.")
        return JSONResponse({"transcript": intro_text, "audio_b64": audio_b64})
    except Exception as e:
        logger.error(f"[{body.session_id[:8]}] Error in /start: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/respond")
@limiter.limit("20/minute")
async def respond(request: Request, audio: UploadFile = File(...), session_id: str = Form(...)):
    """
    Accepts user audio, transcribes it, sends to LLM, returns response.
    Returns: { user_text: str, ai_text: str, audio_b64: str }
    """
    session = _get_session(session_id)
    if session.interview is None:
        raise HTTPException(status_code=400, detail="No active interview. Call /start first.")

    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file received.")

        logger.info(f"[{session_id[:8]}] Received audio: {len(audio_bytes)} bytes, filename={audio.filename}")

        # Whisper transcription is sync + CPU-heavy — run in thread pool
        logger.info(f"[{session_id[:8]}] Transcribing with Whisper...")
        user_text = await asyncio.to_thread(transcribe_audio, audio_bytes, audio.filename or "audio.webm")
        logger.info(f"[{session_id[:8]}] Transcribed: '{user_text}'")

        if not user_text:
            raise HTTPException(status_code=422, detail="Could not transcribe audio. Please try again.")

        # Gemini send_message is sync — run in thread pool
        logger.info(f"[{session_id[:8]}] Sending to LLM...")
        ai_text = await asyncio.to_thread(session.interview.send_message, user_text)
        logger.info(f"[{session_id[:8]}] LLM response ({len(ai_text)} chars). Generating TTS...")

        audio_b64 = await _text_to_audio_b64(ai_text)
        logger.info(f"[{session_id[:8]}] TTS done. Returning response.")

        return JSONResponse({
            "user_text": user_text,
            "ai_text": ai_text,
            "audio_b64": audio_b64,
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{session_id[:8]}] Error in /respond: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/respond-text")
@limiter.limit("20/minute")
async def respond_text(request: Request, body: TextRequest):
    """
    Accepts user text/code, sends to LLM, returns response.
    Returns: { user_text: str, ai_text: str, audio_b64: str }
    """
    session = _get_session(body.session_id)
    if session.interview is None:
        raise HTTPException(status_code=400, detail="No active interview. Call /start first.")

    try:
        user_text = body.text.strip()
        if not user_text:
            raise HTTPException(status_code=400, detail="Empty text received.")

        # Frame the message to the LLM
        if body.is_code:
            language_label = f" ({body.language})" if body.language else ""
            formatted = f"Here is my code solution{language_label}:\n\n```{body.language}\n{user_text}\n```\n\nPlease review my code for correctness, efficiency, edge cases, and code quality. Point out any bugs, suggest improvements, and then ask the next interview question."
        else:
            formatted = user_text

        logger.info(f"[{body.session_id[:8]}] Received text response ({len(user_text)} chars, is_code={body.is_code})")
        # Gemini send_message is sync — run in thread pool
        logger.info(f"[{body.session_id[:8]}] Sending to LLM...")
        ai_text = await asyncio.to_thread(session.interview.send_message, formatted)
        logger.info(f"[{body.session_id[:8]}] LLM response ({len(ai_text)} chars). Generating TTS...")

        audio_b64 = await _text_to_audio_b64(ai_text)
        logger.info(f"[{body.session_id[:8]}] TTS done. Returning response.")

        return JSONResponse({
            "user_text": user_text if not body.is_code else f"[Code submitted{' - ' + body.language if body.language else ''}]\n{user_text}",
            "ai_text": ai_text,
            "audio_b64": audio_b64,
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{body.session_id[:8]}] Error in /respond-text: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/end-interview")
@limiter.limit("5/minute")
async def end_interview(request: Request, body: EndRequest):
    """
    Ends the interview and returns final performance scores.
    Returns: { interview_score: {...}, resume_score: {...} | null }
    """
    session = _get_session(body.session_id)
    if session.interview is None:
        raise HTTPException(status_code=400, detail="No active interview.")

    try:
        # Gemini final score is sync — run in thread pool
        logger.info(f"[{body.session_id[:8]}] Generating final interview scores...")
        interview_score = await asyncio.to_thread(session.interview.get_final_score)
        logger.info(f"[{body.session_id[:8]}] Interview score: {interview_score.get('overall_score')}/10, verdict: {interview_score.get('verdict')}")

        return JSONResponse({
            "interview_score": interview_score,
            "resume_score": session.resume_analysis,
        })
    except Exception as e:
        logger.error(f"[{body.session_id[:8]}] Error in /end-interview: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/active-sessions")
async def active_sessions():
    """Debug endpoint: returns count of active sessions."""
    _cleanup_expired_sessions()
    with _sessions_lock:
        return JSONResponse({
            "active_sessions": len(_sessions),
            "session_ids": [s[:8] + "..." for s in _sessions.keys()],
        })


# Frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
