@echo off
echo ============================================
echo   AI Mock Interviewer - Setup ^& Launch
echo ============================================

:: 0. Kill any old server on port 8000
echo [0/5] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 1. Add ffmpeg to PATH (winget install location)
set "FFMPEG_DIR=%USERPROFILE%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
if exist "%FFMPEG_DIR%\ffmpeg.exe" (
    echo [1/5] Found ffmpeg. Adding to PATH.
    set "PATH=%FFMPEG_DIR%;%PATH%"
) else (
    echo [1/5] WARNING: ffmpeg not found at expected location.
    echo        Whisper STT may not work. Install with: winget install Gyan.FFmpeg
)

:: 2. Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [2/5] Creating virtual environment...
    python -m venv venv
) else (
    echo [2/5] Virtual environment already exists. Skipping.
)

:: 3. Activate venv
echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat

:: 4. Install dependencies
echo [4/5] Installing dependencies...
pip install -r requirements.txt --quiet

:: 5. Launch the server
echo [5/5] Starting FastAPI server at http://127.0.0.1:8000
echo.
echo ============================================
echo   Open browser to: http://127.0.0.1:8000
echo   Press Ctrl+C to stop the server.
echo ============================================
echo.
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
