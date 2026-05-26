#!/usr/bin/env python3
"""Smoke: write one oracle-compatible trace. Usage: python record_smoke.py <out.ndjson>"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from chrysalis_oracle.recorder import Recorder  # noqa: E402


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "trace.ndjson")
    rec = Recorder()
    rec.on_request_start("GET", "/health", headers={"host": "127.0.0.1"})
    rec.on_response(200, "true", headers={"content-type": "application/json"})
    rec.write_ndjson(str(out))
    print(out)


if __name__ == "__main__":
    main()
