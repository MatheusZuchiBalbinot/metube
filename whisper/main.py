import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from faster_whisper import WhisperModel
from pydantic import BaseModel

STORAGE_ROOT = os.environ.get("STORAGE_ROOT", "/storage/app/public")
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
# Hint the language to skip auto-detection (saves ~1-2s per job). Set to None to auto-detect.
LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "pt") or None
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16")

app = FastAPI()

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)


class TranscribeRequest(BaseModel):
    file_path: str


class TranscribeResponse(BaseModel):
    text: str
    language: str


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(body: TranscribeRequest) -> TranscribeResponse:
    full_path = Path(STORAGE_ROOT) / body.file_path.lstrip("/")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {full_path}")

    segments, info = model.transcribe(str(full_path), beam_size=3, language=LANGUAGE, vad_filter=True)
    text = " ".join(segment.text.strip() for segment in segments)

    return TranscribeResponse(text=text, language=info.language)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
