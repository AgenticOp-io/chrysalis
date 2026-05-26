"""Minimal HTTP trace recorder (hub / verify lane)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

SCHEMA_VERSION = "1.0.0"
REDACT_HEADERS = {"authorization", "cookie", "set-cookie"}


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _redact_headers(headers: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in headers.items():
        if k.lower() in REDACT_HEADERS:
            out[k] = "[REDACTED]"
        else:
            out[k] = v
    return out


class Recorder:
    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._trace_id = ""
        self._started_at = ""
        self._active = False

    def on_request_start(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str] | None = None,
        query: dict[str, str] | None = None,
    ) -> None:
        self._active = True
        self._trace_id = str(uuid.uuid4())
        self._started_at = _iso_now()
        self._events.append(
            {
                "type": "http.request",
                "method": method.upper(),
                "path": path,
                "query": query or {},
                "headers": _redact_headers(headers or {}),
                "cookies": {},
                "post": {},
                "rawBody": None,
                "session": {},
            }
        )

    def on_response(
        self,
        status: int,
        body: str,
        *,
        headers: dict[str, str] | None = None,
    ) -> None:
        if not self._active:
            return
        self._events.append(
            {
                "type": "http.response",
                "status": status,
                "headers": _redact_headers(headers or {"content-type": "text/plain"}),
                "body": body,
                "bodyTruncated": False,
                "session": {},
            }
        )

    def build_trace(self) -> dict[str, Any]:
        ended = _iso_now()
        return {
            "header": {
                "type": "header",
                "schemaVersion": SCHEMA_VERSION,
                "traceId": self._trace_id,
                "startedAt": self._started_at,
                "php": {"version": "hub-python", "sapi": "oracle-python"},
                "redaction": {"configHash": "oracle-python-min", "rules": []},
            },
            "events": self._events,
            "footer": {
                "type": "footer",
                "endedAt": ended,
                "durationUs": 1000,
                "eventCount": len(self._events),
                "exitStatus": 0,
            },
        }

    def write_ndjson(self, path: str) -> None:
        trace = self.build_trace()
        with open(path, "w", encoding="utf-8") as f:
            for obj in [trace["header"], *trace["events"], trace["footer"]]:
                f.write(json.dumps(obj, separators=(",", ":")) + "\n")
