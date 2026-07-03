#!/usr/bin/env python3
"""Probe a generated Flask hub app in-process (test_client). Prints JSON to stdout."""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path


def concrete_path(path: str) -> str:
    path = re.sub(r":([A-Za-z_][A-Za-z0-9_]*)", r"1", path)
    path = re.sub(r"\{([A-Za-z_][A-Za-z0-9_]*)\}", r"1", path)
    path = re.sub(r"<([A-Za-z_][A-Za-z0-9_]*)>", r"1", path)
    return path


def main() -> None:
    fixture = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    routes_path = fixture / "chrysalis.oracle-probe-routes.json"
    if not routes_path.is_file():
        print(json.dumps({"ok": False, "error": "missing-probe-routes"}))
        sys.exit(1)
    spec = json.loads(routes_path.read_text(encoding="utf-8"))
    routes = spec.get("routes") or []
    main_py = fixture / "generated" / "python" / "main.py"
    if not main_py.is_file():
        print(json.dumps({"ok": False, "error": "missing-generated-main"}))
        sys.exit(1)
    mod_spec = importlib.util.spec_from_file_location("chrysalis_hub_flask", main_py)
    if mod_spec is None or mod_spec.loader is None:
        print(json.dumps({"ok": False, "error": "import-spec-failed"}))
        sys.exit(1)
    mod = importlib.util.module_from_spec(mod_spec)
    mod_spec.loader.exec_module(mod)
    app = getattr(mod, "app", None)
    if app is None:
        print(json.dumps({"ok": False, "error": "missing-flask-app"}))
        sys.exit(1)
    client = app.test_client()
    results = []
    for route in routes:
        method = str(route.get("method", "GET")).upper()
        path = concrete_path(str(route.get("path", "/")))
        fn = getattr(client, method.lower(), None)
        if fn is None:
            results.append({"method": method, "path": path, "error": "unsupported-method"})
            continue
        resp = fn(path)
        results.append(
            {
                "method": method,
                "path": path,
                "status": resp.status_code,
                "body": resp.get_data(as_text=True),
                "headers": {k: v for k, v in resp.headers.items()},
            }
        )
    print(json.dumps({"ok": True, "results": results, "routeCount": len(results)}))


if __name__ == "__main__":
    main()
