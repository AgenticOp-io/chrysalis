#!/usr/bin/env node
/**
 * Map verify divergence kinds to Hub migration playbooks (STRATEGIC-PLAN Phase 1 / G91).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_VERIFY_PLAYBOOKS_KIND = "chrysalis.hub.verify-playbooks";
export const HUB_VERIFY_PLAYBOOKS_SCHEMA_VERSION = 1;

/** @type {Record<string, { title: string, steps: string[], ingestHints?: string[] }>} */
export const VERIFY_DIVERGENCE_PLAYBOOKS = {
  "status-mismatch": {
    title: "HTTP status differs between legacy and emitted handler",
    steps: [
      "Confirm trace captured the same method and path (redirect chains, method guards).",
      "Check WebIR response lowering (redirect vs json vs empty).",
      "Re-capture oracle after legacy fix if legacy behavior was wrong.",
    ],
    ingestHints: ["web.request response attrs", "early return / exit paths"],
  },
  "header-mismatch": {
    title: "Response headers differ (Content-Type, Set-Cookie, Location)",
    steps: [
      "Compare normalized headers in verify report per route.",
      "Session routes: align cookie name/path with chimera session bridge.",
      "Redirects: pin Location header in ingest or mark expected divergence.",
    ],
    ingestHints: ["header() / setcookie() / redirect() lowering"],
  },
  "body-mismatch": {
    title: "Response body or JSON shape differs",
    steps: [
      "Open per-route verify JSON; inspect first failing trace body diff.",
      "Run insight on project slice for SQL/taint/unescaped-output hints.",
      "Fix ingest or add hole — do not patch emitted TS without verify green.",
    ],
    ingestHints: ["echo/json_encode", "Eloquent/array shapes", "boundary validation"],
  },
};

/**
 * @param {string} [summaryPath]
 */
export function buildVerifyPlaybooksReport(summaryPath) {
  /** @type {Array<{ kind: string, count: number }>} */
  const observed = [];
  let verifyCorrectness = null;
  let summaryFile = summaryPath ?? null;

  if (summaryPath && existsSync(summaryPath)) {
    try {
      const raw = JSON.parse(readFileSync(summaryPath, "utf8"));
      verifyCorrectness = raw.aggregate?.correctness ?? null;
      const counts = new Map();
      for (const ep of raw.endpoints ?? []) {
        for (const d of ep.divergences ?? []) {
          for (const k of d.kinds ?? []) {
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
        }
      }
      for (const [kind, count] of counts) {
        observed.push({ kind, count });
      }
      observed.sort((a, b) => b.count - a.count);
    } catch {
      summaryFile = summaryPath;
    }
  }

  const playbooks = Object.entries(VERIFY_DIVERGENCE_PLAYBOOKS).map(([kind, pb]) => ({
    kind,
    ...pb,
    observedCount: observed.find((o) => o.kind === kind)?.count ?? 0,
  }));

  return {
    kind: HUB_VERIFY_PLAYBOOKS_KIND,
    schemaVersion: HUB_VERIFY_PLAYBOOKS_SCHEMA_VERSION,
    verifySummaryPath: summaryFile,
    verifyCorrectness,
    observedDivergences: observed,
    playbooks,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} projectDir
 */
export function defaultVerifySummaryPath(projectDir) {
  return join(resolve(projectDir), "reports", "verify", "summary.json");
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { projectDir, jsonOut };
}

async function main() {
  const { projectDir, jsonOut } = parseArgs(process.argv);
  const summaryPath = projectDir ? defaultVerifySummaryPath(projectDir) : null;
  const report = buildVerifyPlaybooksReport(summaryPath ?? undefined);
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
