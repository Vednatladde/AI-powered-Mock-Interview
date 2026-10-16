"""
core/llm.py - Gemini LLM integration for the AI Mock Interviewer.

Includes Pydantic validation for all LLM JSON responses so that
malformed output degrades gracefully instead of crashing the server.
"""

import os
import json
import re
import time
import logging
import threading
from pydantic import BaseModel, Field
from typing import Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

logger = logging.getLogger("interview")

load_dotenv()

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Lazy client — created on first use so the server starts instantly
_client = None
_client_lock = threading.Lock()

def _get_client():
    """Return the Gemini client, creating it lazily on first call."""
    global _client
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None:  # double-checked locking
            return _client
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            raise ValueError(
                "GEMINI_API_KEY is missing. Please create a .env file and add: GEMINI_API_KEY=your_key"
            )
        logger.info("Initializing Gemini client...")
        _client = genai.Client(api_key=api_key)
        logger.info("✅ Gemini client ready.")
        return _client

SYSTEM_PROMPT_WITH_RESUME = """
You are Alex, a senior technical interviewer at {company}.
Your goal is to conduct a rigorous, realistic mock technical interview for the role of {role}.

**Your Persona:**
- Professional, composed, and slightly formal.
- Direct and concise. You do not pad your responses with unnecessary praise.
- You challenge the candidate without being rude.

**Your Rules:**
1. You have already reviewed the candidate's resume. Start by briefly introducing yourself (mentioning you are conducting an interview for the **{role}** position at **{company}**), then mention 1-2 things you noticed on their resume and immediately ask your FIRST technical question. Base your questions on what matters for the {role} role at {company} — not generic questions. Do NOT ask them to introduce themselves.
2. Ask one clear question at a time, tailored to the {role} at {company}. Dig into their resume's most relevant experience for this specific role.
3. After the candidate answers, provide a short, honest evaluation (2-3 sentences max): what was good, what was missing or incorrect — specifically in the context of {role} expectations.
4. Then, ask the NEXT question. Progress in difficulty. Mix technical depth with role-specific scenarios (e.g., system design at scale for Google, product sense for PMs, leadership for senior roles).
5. NEVER just agree with the candidate. If their answer is wrong or incomplete, say so clearly and explain why.
6. Cover topics directly relevant to {role} at {company}: role-specific technical skills, behavioral scenarios, system design, domain knowledge.
7. After approximately 5 questions, wrap up with a final holistic assessment — specifically addressing whether this candidate is ready for the {role} role at {company}.

**Response Format:**
- Keep your responses conversational, as if speaking out loud. Avoid markdown, bullet points, or code blocks.
- Use natural spoken language — short paragraphs, clear sentences.
- Always end your turn with a question (unless it's the final summary).
"""

SYSTEM_PROMPT_NO_RESUME = """
You are Alex, a senior technical interviewer at {company}.
Your goal is to conduct a rigorous, realistic mock technical interview for the role of {role}.

**Your Persona:**
- Professional, composed, and slightly formal.
- Direct and concise. You do not pad your responses with unnecessary praise.
- You challenge the candidate without being rude.

**Your Rules:**
1. Start by introducing yourself (mention you are interviewing for the **{role}** position at **{company}**), then ask the candidate for a brief introduction covering their background, skills, and relevant experience for this role.
2. Based on their introduction, ask one clear question at a time tailored to what the {role} role at {company} demands.
3. After the candidate answers, provide a short, honest evaluation (2-3 sentences max): what was good, what was missing — in the context of {role} expectations at {company}.
4. Then, ask the NEXT question. Each question should be slightly harder or go deeper. Mix technical, behavioral, and role-specific scenarios.
5. NEVER just agree with the candidate. If their answer is wrong or incomplete, say so clearly.
6. Focus on topics that matter for {role} at {company}: domain knowledge, problem solving, communication, and culture fit.
7. After approximately 5 questions, wrap up with a targeted assessment of readiness for this specific role.

**Response Format:**
- Keep your responses conversational, as if speaking out loud. Avoid markdown, bullet points, or code blocks.
- Use natural spoken language — short paragraphs, clear sentences.
- Always end your turn with a question (unless it's the final summary).
"""

RESUME_REVIEW_PROMPT = """
You are a professional resume reviewer and career coach. Analyze the following resume text and provide a detailed review.

Evaluate the resume on these criteria (each scored 1-10):
1. **Formatting & Clarity**: Is it well-organized, easy to scan, and free of errors?
2. **Technical Skills**: Are relevant, in-demand skills listed? Is the skill set strong?
3. **Experience & Projects**: Are experiences described with impact and measurable results?
4. **Education**: Is the educational background relevant and well-presented?
5. **Overall Impression**: How competitive is this resume for a tech role?

You MUST respond in valid JSON format exactly like this:
{
    "overall_score": <number 1-10>,
    "scores": {
        "formatting": <number 1-10>,
        "technical_skills": <number 1-10>,
        "experience": <number 1-10>,
        "education": <number 1-10>,
        "overall_impression": <number 1-10>
    },
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "improvements": ["improvement 1", "improvement 2", "improvement 3"],
    "summary": "A 2-3 sentence overall assessment of the resume."
}

Resume text:
"""

INTERVIEW_SCORE_PROMPT = """
Based on the entire interview conversation so far, provide a final performance scorecard for the candidate.

Evaluate on these criteria (each scored 1-10):
1. **Technical Knowledge**: Depth and accuracy of technical answers.
2. **Problem Solving**: Ability to think through problems logically.
3. **Communication**: Clarity and structure of explanations.
4. **Confidence**: Composure and assertiveness in responses.
5. **Overall Performance**: Holistic assessment.

You MUST respond in valid JSON format exactly like this:
{
    "overall_score": <number 1-10>,
    "scores": {
        "technical_knowledge": <number 1-10>,
        "problem_solving": <number 1-10>,
        "communication": <number 1-10>,
        "confidence": <number 1-10>,
        "overall_performance": <number 1-10>
    },
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "improvements": ["improvement 1", "improvement 2", "improvement 3"],
    "summary": "A 2-3 sentence overall assessment of the candidate's interview performance.",
    "verdict": "STRONG HIRE | HIRE | LEAN HIRE | LEAN NO HIRE | NO HIRE"
}
"""


LEVEL_CONTEXT = {
    "fresher": (
        "CANDIDATE LEVEL: Fresher (0–1 year of experience). "
        "Adjust your questions accordingly: start with fundamental concepts, avoid deep-dive system design. "
        "Focus on: basic data structures (arrays, linked lists, stacks), core language syntax, simple algorithmic thinking, and motivation/learning mindset. "
        "Be encouraging but still evaluate clearly. Do not ask about distributed systems, microservices, or senior leadership."
    ),
    "junior": (
        "CANDIDATE LEVEL: Junior Engineer (1–3 years of experience). "
        "Ask moderately technical questions: common algorithms (sorting, searching, BFS/DFS), basic OOP concepts, simple API design, debugging scenarios. "
        "Mix technical questions with some behavioral ones about teamwork and communication. "
        "Expect some gaps in knowledge but look for strong fundamentals and learning ability."
    ),
    "mid": (
        "CANDIDATE LEVEL: Mid-level Engineer (3–5 years of experience). "
        "Ask solid technical questions: system design basics (databases, caching, load balancing), complex algorithms, code quality, testing strategies, CI/CD awareness. "
        "Include behavioral questions about owning features, working across teams, and technical trade-offs. "
        "Expect well-rounded answers with real examples from their work history."
    ),
    "senior": (
        "CANDIDATE LEVEL: Senior Engineer (5+ years of experience). "
        "Ask advanced questions: large-scale system design, architectural trade-offs, technical leadership, mentoring juniors, incident management. "
        "Dive deep into domain expertise. Ask about times they drove technical decisions, handled ambiguity, or influenced product direction. "
        "Hold them to a high bar — vague answers are not acceptable at this level."
    ),
}


ROLE_FIT_PROMPT = """
You are an expert technical recruiter and hiring manager. You are reviewing a candidate's resume specifically for the role of **{role}**{company_ctx}.

Analyze how well this resume fits the target role. Evaluate on these criteria (each scored 1-10):
1. **Role Relevance**: How relevant are the candidate's experiences, projects, and skills to the specific role of {role}?
2. **Skills Match**: Does the candidate have the key technical and soft skills required for {role}? What's missing?
3. **Experience Alignment**: Does the candidate's work history demonstrate progression toward or readiness for this specific role?
4. **Project Impact**: Do the projects/achievements show the kind of impact expected for a {role}?
5. **Overall Role Fit**: Overall, how competitive is this candidate for the {role} position?

Be honest and specific. If the resume is a poor fit, say so clearly.

You MUST respond in valid JSON format exactly like this:
{{
    "overall_score": <number 1-10>,
    "scores": {{
        "role_relevance": <number 1-10>,
        "skills_match": <number 1-10>,
        "experience_alignment": <number 1-10>,
        "project_impact": <number 1-10>,
        "overall_role_fit": <number 1-10>
    }},
    "matching_skills": ["skill 1", "skill 2", "skill 3"],
    "missing_skills": ["missing skill 1", "missing skill 2", "missing skill 3"],
    "strengths": ["strength 1 (specific to this role)", "strength 2", "strength 3"],
    "improvements": ["improvement 1 (specific to getting this role)", "improvement 2", "improvement 3"],
    "summary": "A 2-3 sentence assessment of how well this resume fits the {role} role specifically."
}}

Resume text:
"""


# ─── Pydantic Validation Models ───

class ResumeScoreResponse(BaseModel):
    overall_score: int = Field(ge=1, le=10, default=5)
    scores: dict[str, int] = {}
    strengths: list[str] = []
    improvements: list[str] = []
    summary: str = ""

class InterviewScoreResponse(BaseModel):
    overall_score: int = Field(ge=1, le=10, default=5)
    scores: dict[str, int] = {}
    strengths: list[str] = []
    improvements: list[str] = []
    summary: str = ""
    verdict: str = "UNABLE TO EVALUATE"

class RoleFitResponse(BaseModel):
    overall_score: int = Field(ge=1, le=10, default=5)
    scores: dict[str, int] = {}
    matching_skills: list[str] = []
    missing_skills: list[str] = []
    strengths: list[str] = []
    improvements: list[str] = []
    summary: str = ""


def safe_parse_json(text: str, model_class: type[BaseModel]) -> dict:
    """Parse and validate LLM JSON output with graceful fallbacks.

    1. Strips markdown code fences if present.
    2. Extracts JSON object with regex if surrounded by text.
    3. Validates against the Pydantic model.
    4. Returns safe defaults if parsing fails entirely.
    """
    cleaned = text.strip()

    # Strip markdown code fences
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

    # Try to extract JSON object from mixed text
    json_match = re.search(r'\{[\s\S]*\}', cleaned)
    if json_match:
        cleaned = json_match.group()

    try:
        parsed = json.loads(cleaned)
        validated = model_class(**parsed)
        return validated.model_dump()
    except (json.JSONDecodeError, Exception) as e:
        logger.error(f"Failed to parse LLM response: {e}\nRaw text (first 500 chars): {text[:500]}")
        # Return safe defaults from the model
        return model_class().model_dump()


def analyze_resume(resume_text: str) -> dict:
    """Send resume text to Gemini for analysis and return structured scores."""
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=RESUME_REVIEW_PROMPT + resume_text,
    )
    return safe_parse_json(response.text, ResumeScoreResponse)


def analyze_resume_for_role(resume_text: str, role: str, company: str = "") -> dict:
    """Analyze resume specifically for a target role and return structured role-fit scores."""
    company_ctx = f" at **{company}**" if company else ""
    prompt = ROLE_FIT_PROMPT.format(role=role, company_ctx=company_ctx) + resume_text
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
    )
    return safe_parse_json(response.text, RoleFitResponse)


class InterviewSession:
    def __init__(self, resume_text: str = "", role: str = "", company: str = "", level: str = "junior"):
        self.resume_text = resume_text
        self.role = role or "Software Engineer"
        self.company = company or "a top-tier tech company"
        self.level = level if level in LEVEL_CONTEXT else "junior"
        self.level_label = {"fresher": "Fresher (0–1 yr)", "junior": "Junior (1–3 yr)", "mid": "Mid-level (3–5 yr)", "senior": "Senior (5+ yr)"}.get(self.level, "Junior")
        level_instructions = LEVEL_CONTEXT[self.level]

        if resume_text:
            system = SYSTEM_PROMPT_WITH_RESUME.format(role=self.role, company=self.company)
            system += f"\n\n**CANDIDATE'S RESUME:**\n{resume_text}\n\nUse this resume to tailor your questions specifically for the {self.role} role at {self.company}. Reference relevant projects, skills, and experiences."
        else:
            system = SYSTEM_PROMPT_NO_RESUME.format(role=self.role, company=self.company)

        system += f"\n\n**DIFFICULTY CALIBRATION:**\n{level_instructions}"

        self.chat = _get_client().chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(
                system_instruction=system
            )
        )
        self.question_count = 0

    def send_message(self, user_message: str) -> str:
        """Send a message to the LLM with automatic retry on rate limits and server errors."""
        last_error = None
        for attempt in range(3):
            try:
                response = self.chat.send_message(user_message)
                self.question_count += 1
                return response.text
            except Exception as e:
                last_error = e
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait = 15 * (attempt + 1)
                    logger.warning(f"Rate limited. Retrying in {wait}s (attempt {attempt+1}/3)...")
                    time.sleep(wait)
                elif "500" in error_str or "503" in error_str:
                    wait = 5 * (attempt + 1)
                    logger.warning(f"Server error. Retrying in {wait}s (attempt {attempt+1}/3)...")
                    time.sleep(wait)
                else:
                    raise

        # All retries exhausted — return graceful fallback instead of crashing
        logger.error(f"All retries failed for send_message: {last_error}")
        return (
            "I apologize, but I'm experiencing a brief technical issue. "
            "Could you please repeat your last answer? "
            "Let's continue from where we left off."
        )

    def start(self) -> str:
        """Kick off the interview."""
        if self.resume_text:
            return self.send_message(
                f"I've uploaded my resume. I am applying for the {self.role} role at {self.company} "
                f"and I am a {self.level_label} candidate. "
                f"You've already reviewed my resume. Please start the interview by referencing my background "
                f"and asking the first question calibrated to my experience level."
            )
        return self.send_message(
            f"Please start the interview. I am applying for the {self.role} role at {self.company} "
            f"and I am a {self.level_label} candidate. "
            f"I haven't uploaded a resume, so please ask me to introduce myself, "
            f"then tailor your questions to my experience level and this specific position."
        )

    def get_final_score(self) -> dict:
        """Ask the LLM to generate a final interview score based on the conversation."""
        response = self.chat.send_message(INTERVIEW_SCORE_PROMPT)
        return safe_parse_json(response.text, InterviewScoreResponse)
