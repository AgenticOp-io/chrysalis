#!/usr/bin/env python3
"""Record oracle-compatible traces for hub gold fixture routes.

Usage:
  python record_fixture_routes.py out.ndjson routes.json

routes.json shape:
  { "routes": [ { "method": "GET", "path": "/health", "status": 200, "body": "true" } ] }
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from chrysalis_oracle.recorder import Recorder  # noqa: E402


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "trace.ndjson")
    routes_path = Path(sys.argv[2] if len(sys.argv) > 2 else "routes.json")
    spec = json.loads(routes_path.read_text(encoding="utf-8"))
    routes = spec.get("routes") or []
    rec = Recorder()
    for route in routes:
        method = str(route.get("method", "GET")).upper()
        path = str(route.get("path", "/"))
        status = int(route.get("status", 200))
        body = route.get("body")
        if body is None:
            body = "null"
        elif not isinstance(body, str):
            body = json.dumps(body, separators=(",", ":"))
        headers = route.get("headers") or {"content-type": "application/json"}
        rec.on_request_start(method, path, headers={"host": "127.0.0.1"})
        rec.on_response(status, body, headers=headers)
    rec.write_ndjson(str(out))
    print(json.dumps({"ok": True, "routeCount": len(routes), "out": str(out)}))


if __name__ == "__main__":
    main()
