"""
backend/stt.py - Speech-to-Text using OpenAI Whisper (local model).
Transcribes an uploaded audio file to text.

The model is loaded lazily in a background thread so the server starts instantly.
"""

import whisper
import tempfile
import os
import threading
import logging
import time

logger = logging.getLogger("interview")

_model = None
_model_lock = threading.Lock()
_model_loading = False
_model_error = None


def _load_model():
    """Load Whisper model in a background thread."""
    global _model, _model_loading, _model_error
    try:
        logger.info("Loading Whisper 'base' model in background...")
        _model = whisper.load_model("base")
        logger.info("✅ Whisper model loaded successfully.")
    except Exception as e:
        _model_error = e
        logger.error(f"❌ Failed to load Whisper model: {e}")
    finally:
        _model_loading = False


def init_whisper():
    """Start loading the Whisper model in a background thread.
    Call this at server startup so the model is ready by the time
    the first audio arrives (usually after resume upload + interview start).
    """
    global _model_loading
    with _model_lock:
        if _model is not None or _model_loading:
            return  # Already loaded or loading
        _model_loading = True
    thread = threading.Thread(target=_load_model, daemon=True)
    thread.start()


def _get_model():
    """Get the Whisper model, waiting if it's still loading."""
    if _model_error:
        raise RuntimeError(f"Whisper failed to load: {_model_error}")
    if _model is not None:
        return _model

    if _model_loading:
        logger.info("Waiting for Whisper model to finish loading...")
        for _ in range(60):  # Wait up to 30 seconds
            if _model is not None:
                return _model
            if _model_error:
                raise RuntimeError(f"Whisper failed to load: {_model_error}")
            time.sleep(0.5)

    if _model is None:
        # Last resort: try loading synchronously
        logger.warning("Whisper model not loaded yet. Loading synchronously...")
        _load_model()
        if _model is None:
            raise RuntimeError("Whisper model could not be loaded.")
    return _model


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribes audio bytes to text using Whisper.
    Returns the transcribed string.
    """
    model = _get_model()

    # Write bytes to a temp file
    suffix = os.path.splitext(filename)[-1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(tmp_path, fp16=False)
        return result["text"].strip()
    finally:
        os.remove(tmp_path)
