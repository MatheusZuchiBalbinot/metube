"""Tests for the Whisper bridge transcribe endpoint.

These tests run without a GPU, without network access and without loading the
real Whisper model:

* ``faster_whisper`` is stubbed in ``sys.modules`` before importing ``main`` so
  no model is downloaded or imported.
* ``STORAGE_ROOT`` is pointed at a temporary directory created per test run.
"""

import importlib
import sys
import types
from pathlib import Path

from fastapi.testclient import TestClient


def _build_client(tmp_path: Path) -> TestClient:
    # Stub faster_whisper so importing main never touches the real model.
    fake_module = types.ModuleType("faster_whisper")
    fake_module.WhisperModel = object  # type: ignore[attr-defined]
    sys.modules["faster_whisper"] = fake_module

    import os

    os.environ["STORAGE_ROOT"] = str(tmp_path)

    # Ensure main is imported fresh against the stub and env above.
    sys.modules.pop("main", None)
    main = importlib.import_module("main")

    return TestClient(main.app)


def test_path_traversal_is_rejected(tmp_path: Path) -> None:
    client = _build_client(tmp_path)

    response = client.post("/transcribe", json={"file_path": "../../etc/passwd"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid file path"


def test_missing_file_inside_root_returns_404(tmp_path: Path) -> None:
    client = _build_client(tmp_path)

    response = client.post("/transcribe", json={"file_path": "does/not/exist.mp4"})

    assert response.status_code == 404
    assert "File not found" in response.json()["detail"]
