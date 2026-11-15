#!/usr/bin/env python3
"""Inline the exported model into the predictor page.

Reads  ml/artifacts/model.json + ml/predictor_template.html
Writes ml/predictor.html — a single self-contained file (no network, no CDN).

Usage:
    python3 ml/train_test_model.py && python3 ml/build_predictor.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "ml" / "artifacts" / "model.json"
TEMPLATE = ROOT / "ml" / "predictor_template.html"
OUT = ROOT / "ml" / "predictor.html"
PLACEHOLDER = "__MODEL_JSON__"


def main() -> int:
    for path in (MODEL, TEMPLATE):
        if not path.exists():
            raise SystemExit(f"missing {path.relative_to(ROOT)} — run python3 ml/train_test_model.py first")

    model = json.loads(MODEL.read_text())
    payload = json.dumps(model, separators=(",", ":"))

    # Guard: the JSON must not be able to close the surrounding <script>.
    if "</" in payload:
        payload = payload.replace("</", "<\\/")

    html = TEMPLATE.read_text()
    if html.count(PLACEHOLDER) != 1:
        raise SystemExit(f"expected exactly one {PLACEHOLDER} in the template")

    html = html.replace(PLACEHOLDER, payload, 1)
    OUT.write_text(html)

    size = OUT.stat().st_size
    print(f"wrote {OUT.relative_to(ROOT)} — {size/1024:.0f} KB "
          f"({len(model['classifier']['trees'])} + {len(model['regressor']['trees'])} trees inlined)")
    print(f"open: file://{OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
