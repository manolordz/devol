"""Vercel Python serverless entrypoint.

Vercel's @vercel/python runtime looks for a module-level `app` (ASGI/WSGI
callable) in this file. The actual FastAPI app lives in `backend/main.py`,
so we add `backend/` to sys.path and re-export it here.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402

__all__ = ["app"]
