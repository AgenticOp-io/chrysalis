"""Chrysalis CLI shim: forwards to the Node implementation."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

REL_CLI = Path("packages") / "cli" / "dist" / "bin.js"


def _find_node() -> str:
    env = os.environ.get("CHRYSALIS_NODE", "").strip()
    if env:
        return env
    node = shutil.which("node")
    if not node:
        print(
            "[chrysalis-py] node not found on PATH (install Node 20+ or set CHRYSALIS_NODE)",
            file=sys.stderr,
        )
        sys.exit(2)
    return node


def _find_cli_js() -> Path:
    raw = os.environ.get("CHRYSALIS_CLI_JS", "").strip()
    if raw:
        p = Path(raw).resolve()
        if not p.is_file():
            print(f"[chrysalis-py] CHRYSALIS_CLI_JS is not a file: {p}", file=sys.stderr)
            sys.exit(2)
        return p

    for start in (Path.cwd(), Path(__file__).resolve().parent):
        d = start.resolve()
        while True:
            cand = (d / REL_CLI).resolve()
            if cand.is_file():
                return cand
            if d.parent == d:
                break
            d = d.parent

    print(
        "[chrysalis-py] could not find packages/cli/dist/bin.js; "
        "run `pnpm --filter @chrysalis/cli build` from the repo root or set CHRYSALIS_CLI_JS",
        file=sys.stderr,
    )
    sys.exit(2)


def main() -> None:
    node = _find_node()
    js = _find_cli_js()
    argv = [node, str(js), *sys.argv[1:]]
    try:
        proc = subprocess.run(argv, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr)
    except OSError as e:
        print(f"[chrysalis-py] failed to exec: {e}", file=sys.stderr)
        sys.exit(2)
    raise SystemExit(proc.returncode)


if __name__ == "__main__":
    main()
