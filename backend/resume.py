"""
backend/resume.py - PDF resume text extraction.
"""

import pdfplumber
import tempfile
import os


def extract_resume_text(pdf_bytes: bytes) -> str:
    """
    Extracts all text from a PDF resume.
    Returns the full text as a single string.
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        text_parts = []
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts).strip()
    finally:
        os.remove(tmp_path)
