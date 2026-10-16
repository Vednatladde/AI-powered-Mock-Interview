"""
backend/ffmpeg_setup.py - Dynamic FFmpeg detection.

Searches multiple common install locations instead of hardcoding a single
WinGet path. Also supports a custom FFMPEG_PATH environment variable.
"""

import shutil
import os
import logging

logger = logging.getLogger("interview")

# Common FFmpeg locations on Windows
_COMMON_PATHS = [
    # WinGet (default)
    os.path.expanduser(
        r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
    ),
    # Chocolatey
    r"C:\ProgramData\chocolatey\bin",
    # Scoop
    os.path.expanduser(r"~\scoop\shims"),
    # Manual install common locations
    r"C:\ffmpeg\bin",
    os.path.expanduser(r"~\ffmpeg\bin"),
    r"C:\Program Files\ffmpeg\bin",
    r"C:\Program Files (x86)\ffmpeg\bin",
]


def ensure_ffmpeg() -> bool:
    """
    Find ffmpeg and add it to PATH if needed.
    Returns True if ffmpeg is available, False otherwise.

    Search order:
    1. Already on system PATH
    2. FFMPEG_PATH environment variable
    3. Common Windows install locations
    """
    # 1. Already on PATH?
    if shutil.which("ffmpeg"):
        logger.info(f"✅ FFmpeg found on PATH: {shutil.which('ffmpeg')}")
        return True

    # 2. Custom env var?
    custom = os.environ.get("FFMPEG_PATH")
    if custom and os.path.isdir(custom):
        os.environ["PATH"] = custom + os.pathsep + os.environ.get("PATH", "")
        if shutil.which("ffmpeg"):
            logger.info(f"✅ FFmpeg found via FFMPEG_PATH: {custom}")
            return True

    # 3. Check common locations
    for path in _COMMON_PATHS:
        if not os.path.isdir(path):
            continue
        ffmpeg_exe = os.path.join(path, "ffmpeg.exe")
        if os.path.isfile(ffmpeg_exe):
            os.environ["PATH"] = path + os.pathsep + os.environ.get("PATH", "")
            logger.info(f"✅ FFmpeg found at: {path}")
            return True

    logger.warning(
        "⚠️  FFmpeg not found! Whisper STT will likely fail.\n"
        "   Install with:  winget install Gyan.FFmpeg\n"
        "   Or set env var: FFMPEG_PATH=C:\\path\\to\\ffmpeg\\bin"
    )
    return False
