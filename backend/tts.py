"""
backend/tts.py - Text-to-Speech using edge-tts (free Microsoft voices).
Converts text to MP3 audio in-memory for streaming to the frontend.

Now fully async — no more event loop hacks or ThreadPoolExecutor workarounds.
"""

import edge_tts
import io
import logging

logger = logging.getLogger("interview")

# A professional, clear English male voice
VOICE = "en-US-GuyNeural"


async def synthesize_speech(text: str) -> bytes:
    """
    Converts text to speech and returns the audio as MP3 bytes.
    Fully async — call with `await` from FastAPI endpoints.
    """
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])
        audio_buffer.seek(0)
        audio_bytes = audio_buffer.read()

        if not audio_bytes:
            logger.warning("TTS returned empty audio. Text may be too short or unsupported.")

        return audio_bytes
    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise
