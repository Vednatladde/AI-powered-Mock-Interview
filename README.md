# 🎙️ AI-Powered Mock Interview Studio

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/Vednatladde/AI-powered-Mock-Interview?style=for-the-badge&logo=github&color=blue)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Whisper](https://img.shields.io/badge/OpenAI_Whisper-412991?style=for-the-badge&logo=openai&logoColor=white)

**An intelligent, voice-and-text mock interview platform with live voice interaction, resume ATS parsing, browser code execution, and multi-metric performance scorecards.**

[Getting Started](#-getting-started) • [Features](#-features) • [Architecture](#-architecture) • [API Docs](#-api-reference) • [Author](#-author) • [License](#-license)

</div>

---

## 📖 Overview

**AI Mock Interview Studio** is a technical interview preparation ecosystem. By leveraging **Google Gemini 2.5 Flash**, **OpenAI Whisper** (speech-to-text), and **Microsoft Edge-TTS** (neural text-to-speech), the platform replicates the cadence and rigor of a real technical interview. 

Candidates can upload their resume to test ATS compatibility, speak or type their answers, write code directly in an embedded editor, and receive a comprehensive post-interview evaluation report with actionable growth areas.

---

## ✨ Features

- 🤖 **Adaptive AI Interviewer ("Alex")**: Powered by Google Gemini 2.5 Flash; tailors questions dynamically to your target role, target company, and experience level.
- 🎤 **Voice-to-Voice Interaction**: Speak your answers naturally. Whisper transcribes audio locally with high fidelity.
- 🔊 **Neural Speech Playback**: "Alex" speaks questions and feedback aloud using Edge-TTS with natural intonation and zero API cost.
- 📄 **Resume Upload & Role-Fit Scoring**: Upload a PDF resume for instant ATS parsing, role match evaluation, and tailored question generation.
- 💻 **Live In-Browser Code Editor**: Submit algorithm and system design code snippets for real-time complexity and logic evaluation.
- 📊 **Comprehensive Scorecards**: Multi-metric evaluation across **Technical Knowledge**, **Communication**, **Problem Solving**, and **Confidence**.
- 🏢 **Session Isolation**: Concurrent multi-user support with isolated in-memory session states.
- 🛡️ **Built-in Rate Limiting**: SlowAPI protection against burst requests and API quota exhaustion.

---

## 🏗️ Architecture

```
AI-powered-mock-interview/
├── backend/                  # FastAPI Application
│   ├── main.py               # REST API endpoints & session lifecycle
│   ├── stt.py                # Local speech-to-text via OpenAI Whisper
│   ├── tts.py                # Neural text-to-speech via Edge-TTS
│   ├── resume.py             # PDF text extraction & parsing (pdfplumber)
│   ├── ffmpeg_setup.py       # Cross-platform FFmpeg detection & PATH injection
│   └── __init__.py
├── core/                     # Intelligence & Prompt Engine
│   ├── llm.py                # Google Gemini integration, rubrics & scoring
│   └── __init__.py
├── web-app/                  # Modern Next.js 15 Frontend
│   ├── src/app/              # Next.js App Router (Landing, Session UI)
│   ├── src/components/       # Reusable UI widgets & animations
│   ├── tailwind.config.ts    # Design system tokens
│   └── package.json          # Frontend dependencies
├── frontend/                 # Lightweight vanilla HTML5/JS/CSS frontend
│   ├── landing.html          # Alternative standalone landing page
│   ├── index.html            # Interview terminal interface
│   ├── app.js                # Client logic & Web Audio API
│   └── style.css             # Interface styles
├── requirements.txt          # Python dependencies
├── .env.example              # Template environment variables
├── start.bat                 # One-click Windows startup script
├── LICENSE                   # MIT License
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

| Component | Minimum Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Required for backend & Whisper |
| **Node.js** | 18+ (LTS) | Required for Next.js web application |
| **FFmpeg** | Any modern build | Required for audio processing |
| **Gemini API Key** | — | Free key available at [Google AI Studio](https://aistudio.google.com/app/apikey) |

#### FFmpeg Setup (Windows)
```bash
winget install Gyan.FFmpeg
```

---

### Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Vednatladde/AI-powered-Mock-Interview.git
cd AI-powered-Mock-Interview
```

#### 2. Configure Environment Variables
Copy the template configuration file:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and insert your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000
```

#### 3. Backend Setup (FastAPI)
```bash
# Create and activate Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
> The backend server will be live at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

#### 4. Frontend Setup (Next.js 15)
Open a separate terminal window:
```bash
cd web-app
npm install
npm run dev
```
> The web application will launch at `http://localhost:3000`.

---

### ⚡ One-Click Launch (Windows)

On Windows systems, you can simply run **`start.bat`** or execute:
```cmd
start.bat
```
This script automatically:
1. Detects and injects FFmpeg into the environment PATH.
2. Initializes the Python virtual environment if missing.
3. Installs backend requirements.
4. Launches the FastAPI server with hot-reload enabled.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/create-session` | Initialize a new candidate session with unique ID |
| `POST` | `/upload-resume` | Upload & extract text from candidate PDF resume |
| `POST` | `/analyze-role-fit` | Evaluate resume alignment with target role/company |
| `POST` | `/start` | Generate opening interview greeting & question |
| `POST` | `/respond` | Transcribe voice answer (WAV/WebM) & generate response |
| `POST` | `/respond-text` | Submit written explanation or code block for evaluation |
| `POST` | `/end-interview` | Conclude session & generate detailed final scorecard |
| `GET` | `/active-sessions` | System monitoring endpoint for active session count |

---

## 🎯 Experience Levels & Focus

| Level | Experience Bracket | Assessment Focus |
|---|---|---|
| **Fresher** | 0 – 1 Years | Programming fundamentals, foundational DSA, CS concepts, enthusiasm |
| **Junior** | 1 – 3 Years | OOP, API integration, debugging, practical problem solving |
| **Mid-Level** | 3 – 5 Years | System design, concurrency, trade-off analysis, unit testing |
| **Senior** | 5+ Years | Scalability, microservices, fault tolerance, team leadership |

---

## 🛠️ Tech Stack

- **Large Language Model**: Google Gemini (`gemini-2.5-flash`) via `google-genai` SDK
- **Speech Processing**: OpenAI Whisper (`base.en` / `tiny` local model) & Microsoft Edge-TTS
- **Backend Framework**: FastAPI, Uvicorn, Pydantic, SlowAPI
- **Document Processing**: `pdfplumber` for structured PDF resume extraction
- **Frontend Framework**: Next.js 15 (App Router, TypeScript, Tailwind CSS, Framer Motion)

---

## 👤 Author

**Vedant Ladde**
- GitHub: [@Vednatladde](https://github.com/Vednatladde)
- Repository: [AI-powered-Mock-Interview](https://github.com/Vednatladde/AI-powered-Mock-Interview)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.  
Copyright (c) 2026 **Vedant Ladde**. All rights reserved.

---

## 🙏 Acknowledgements

- [Google DeepMind](https://deepmind.google/) for the Gemini API
- [OpenAI](https://openai.com/) for the Whisper speech recognition model
- [Microsoft](https://www.microsoft.com/) for Edge-TTS neural speech voices
