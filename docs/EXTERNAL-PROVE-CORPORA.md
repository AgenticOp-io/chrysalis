# External prove corpora

> **Status:** active — honest inventory + Chrysalis gate scoreboard for public modernization-prove corpora  
> **Laws:** **D6442** translate-only · **D6447** no demo façades · honest `ok` / `skip` / `fail`  
> **Gate:** `pnpm run hub:external-prove-corpus-smoke`  
> **Report:** `reports/prove/external-corpus-prove.json`

This is **not** a claim against third-party leaderboards. Chrysalis runs its own inventory and existing smokes against corpora that those frameworks use as stress material.

## Corpora

| Corpus | Source | Env / default path | What Chrysalis does |
| --- | --- | --- | --- |
| **CLBS** | [COBOL-Legacy-Benchmark-Suite](https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite) | `CHRYSALIS_COBOL_CLBS_ROOT` (default `$HOME/COBOL-Legacy-Benchmark-Suite` or sibling of repo) | Inventory `.cbl`/`.cpy` + `hub:cobol-clbs-prove-smoke` (in-tree mini always; full suite when root present) |
| **LegacyCodeBench** | [Kalmantic/legacycodebench](https://github.com/Kalmantic/legacycodebench) | `CHRYSALIS_LEGACYCODEBENCH_ROOT` (default `$HOME/legacycodebench`) | **Inventory only** under `datasets/` (auto-cloned via their `load-datasets` — not in git). **No LCB leaderboard score.** |
| **In-tree gold** | Chrysalis fixtures | (repo) | `hub:cobol-best-fit-smoke`, `hub:site-port-close-smoke` (`fixtures/tiny-blog`), `hub:laravel-min-smoke`, optional Express / plain-PHP / Symfony / node-express oracle flagships |

See also [`COBOL-MODERNIZATION-PROVE.md`](./COBOL-MODERNIZATION-PROVE.md) for the CLBS 3-track bar.

## Point env vars (GCE)

```bash
export CHRYSALIS_COBOL_CLBS_ROOT="$HOME/COBOL-Legacy-Benchmark-Suite"
export CHRYSALIS_LEGACYCODEBENCH_ROOT="$HOME/legacycodebench"

# Optional: clone if missing
test -d "$CHRYSALIS_COBOL_CLBS_ROOT" || \
  git clone --depth 1 https://github.com/sentientsergio/COBOL-Legacy-Benchmark-Suite.git "$CHRYSALIS_COBOL_CLBS_ROOT"
test -d "$CHRYSALIS_LEGACYCODEBENCH_ROOT" || \
  git clone --depth 1 https://github.com/Kalmantic/legacycodebench.git "$CHRYSALIS_LEGACYCODEBENCH_ROOT"

# LCB COBOL sources live in datasets/ after their loader (optional):
#   cd "$CHRYSALIS_LEGACYCODEBENCH_ROOT" && pip install -e . && legacycodebench load-datasets

cd ~/chrysalis-test   # or your Chrysalis checkout
pnpm run hub:external-prove-corpus-smoke
```

Windows (PowerShell):

```powershell
$env:CHRYSALIS_COBOL_CLBS_ROOT = "C:\path\to\COBOL-Legacy-Benchmark-Suite"
$env:CHRYSALIS_LEGACYCODEBENCH_ROOT = "C:\path\to\legacycodebench"
pnpm run hub:external-prove-corpus-smoke
```

## Flags

| Flag | Effect |
| --- | --- |
| `--quick` | Skip Express / plain-PHP / Symfony / node-express-oracle flagships |
| `--skip-clbs` | Skip `hub:cobol-clbs-prove-smoke` |
| `--skip-best-fit` | Skip `hub:cobol-best-fit-smoke` |
| `--skip-site-port` | Skip site-port close smoke |
| `--skip-laravel` | Skip laravel-min smoke |

## Scoreboard semantics

| Result | Meaning |
| --- | --- |
| **ok** | Gate passed (or inventory found usable COBOL) |
| **skip** | Missing root, missing datasets, missing script, or explicit `--skip-*` / `--quick` — honest, not a green claim |
| **fail** | Gate ran and failed |

Overall smoke `ok` is true when **fail count is zero** (skips allowed).

## Related

- [`CURSOR-PILOT-KIT.md`](./CURSOR-PILOT-KIT.md) — buyer laravel-min wedge
- [`COBOL-PRIMARY-UNIVERSAL-BUILD.md`](./COBOL-PRIMARY-UNIVERSAL-BUILD.md) — COBOL primary queue
- `scripts/hub-ingest/hub-external-prove-corpus-smoke.mjs`
