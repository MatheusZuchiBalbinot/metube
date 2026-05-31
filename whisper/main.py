import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from faster_whisper import WhisperModel
from pydantic import BaseModel

STORAGE_ROOT = os.environ.get("STORAGE_ROOT", "/storage/app/public")
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
# Hint the language to skip auto-detection (saves ~1-2s per job). Set to None to auto-detect.
LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "pt") or None

app = FastAPI()

model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

class TranscribeRequest(BaseModel):
    file_path: str
    task: str = "transcribe"


class TranscribeResponse(BaseModel):
    text: str
    language: str
    vtt: str

def _format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)

    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def _segments_to_vtt(segments: list) -> str:
    lines = ["WEBVTT", ""]

    for i, segment in enumerate(segments, start=1):
        start = _format_timestamp(segment.start)
        end = _format_timestamp(segment.end)
        lines.extend([str(i), f"{start} --> {end}", segment.text.strip(), ""])

    return "\n".join(lines)

@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(body: TranscribeRequest) -> TranscribeResponse:
    full_path = Path(STORAGE_ROOT) / body.file_path.lstrip("/")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {full_path}")

    is_translate = body.task == "translate"
    task = "translate" if is_translate else "transcribe"
    # For translation, skip language hint so Whisper auto-detects the source language.
    language = None if is_translate else LANGUAGE

    segments_gen, info = model.transcribe(
        str(full_path),
        beam_size=5,
        language=language,
        task=task,
        vad_filter=True,
    )

    segments = list(segments_gen)
    text = " ".join(s.text.strip() for s in segments)
    vtt = _segments_to_vtt(segments)
    # Translation always outputs English regardless of info.language.
    detected_language = "en" if is_translate else info.language

    return TranscribeResponse(text=text, language=detected_language, vtt=vtt)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
