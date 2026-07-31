#!/usr/bin/env node
/**
 * Cursor Pilot Kit — one-shot COBOL CLBS wedge prove (parallel to laravel-min).
 * Runs inventory/best-fit + residual ledger (no Db2/CICS/VSAM invent).
 *
 * Gate companion: hub:cursor-pilot-kit-smoke
 * Docs: docs/CURSOR-PILOT-KIT.md · docs/COBOL-MODERNIZATION-PROVE.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "reports/pilot-kit");
const OUT_JSON = join(OUT_DIR, "cobol-clbs-pilot.json");

/**
 * @param {string} script
 * @param {string[]} args
 * @param {number} [timeoutMs]
 */
function runNode(script, args = [], timeoutMs = 600_000) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: r.status ?? 1,
    signal: r.signal,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

/**
 * @param {string} stdout
 */
function parseJsonTail(stdout) {
  const i = String(stdout || "").indexOf("{");
  if (i < 0) return null;
  try {
    return JSON.parse(stdout.slice(i));
  } catch {
    return null;
  }
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const steps = [];

  const mini = join(ROOT, "fixtures/hub-cobol-clbs-mini");
  const miniOk = existsSync(join(mini, "batch")) && existsSync(join(mini, "online"));
  steps.push({
    id: "clbs-mini-present",
    ok: miniOk,
    detail: miniOk ? undefined : "fixtures/hub-cobol-clbs-mini missing",
  });

  let bestFitOk = false;
  let exhaustedOk = false;
  let residualOk = false;
  /** @type {string | undefined} */
  let p0Open;

  if (miniOk) {
    const best = runNode(
      join(ROOT, "scripts/hub-ingest/hub-cobol-best-fit-smoke.mjs"),
      [],
      180_000,
    );
    const bestJson = parseJsonTail(best.stdout);
    bestFitOk = best.status === 0 && bestJson?.ok === true;
    const exhausted = (bestJson?.results || []).find(
      (r) => r.id === "cobol-inventory-peels-exhausted",
    );
    exhaustedOk = exhausted?.ok === true;
    steps.push({
      id: "cobol-best-fit-smoke",
      ok: bestFitOk,
      detail: bestFitOk
        ? `passed=${bestJson?.passed}/${bestJson?.suiteCount}`
        : (best.stderr || best.stdout).slice(-800) || `exit=${best.status}`,
    });
    steps.push({
      id: "cobol-inventory-peels-exhausted",
      ok: exhaustedOk,
      detail: exhaustedOk ? exhausted?.reason : exhausted?.reason || "gate missing",
    });

    const residual = runNode(
      join(ROOT, "scripts/hub-ingest/cobol-residual-ledger.mjs"),
      ["--origin", "fixtures/hub-cobol-clbs-mini"],
      120_000,
    );
    const residualJson = parseJsonTail(residual.stdout);
    residualOk =
      residual.status === 0 &&
      residualJson?.kind === "chrysalis.cobol.residual.v1";
    const openP0 = (residualJson?.items || []).filter(
      (i) => i.priority === "P0" && i.status === "open",
    );
    const absentP0 = (residualJson?.items || []).filter(
      (i) => i.priority === "P0" && i.status === "absent",
    );
    p0Open = openP0.map((i) => i.id).join(",") || undefined;
    const soleExtfmap =
      (openP0.length === 1 && openP0[0]?.id === "copy:EXTFMAP") ||
      (openP0.length === 0 &&
        absentP0.length === 1 &&
        absentP0[0]?.id === "copy:EXTFMAP");
    steps.push({
      id: "cobol-residual-ledger",
      ok: residualOk && soleExtfmap,
      detail: residualOk
        ? `p0Open=${p0Open || "none"} p0Absent=${absentP0.map((i) => i.id).join(",") || "none"} items=${residualJson?.summary?.itemCount}`
        : (residual.stderr || residual.stdout).slice(-500) || `exit=${residual.status}`,
    });
  }

  const docsOk =
    existsSync(join(ROOT, "docs/CURSOR-PILOT-KIT.md")) &&
    existsSync(join(ROOT, "docs/COBOL-MODERNIZATION-PROVE.md")) &&
    existsSync(join(ROOT, "docs/DO-NOT-INVENT.md"));
  steps.push({ id: "cobol-pilot-docs", ok: docsOk });

  const mcpOk = existsSync(join(ROOT, "fixtures/pilot-kit/cursor-mcp.json"));
  steps.push({ id: "pilot-kit-mcp-config", ok: mcpOk });

  const ok = steps.every((s) => s.ok);
  const report = {
    kind: "chrysalis.pilot-kit.cobol-clbs",
    schemaVersion: 1,
    ok,
    wedge: "fixtures/hub-cobol-clbs-mini",
    invariant:
      "Models propose; WebIR + residual ledger dispose — no EXTFMAP/Db2/CICS/VSAM invent (D6442/D6447)",
    residualP0Open: p0Open || null,
    note:
      "Full behavioral CLBS prove remains hub:cobol-clbs-prove-smoke / GCE; this pilot is inventory+best-fit+residual",
    next: {
      mcp: "Copy fixtures/pilot-kit/cursor-mcp.json into Cursor MCP settings; set cwd to repo root",
      rule: "Optional: copy fixtures/pilot-kit/chrysalis-pilot.mdc → .cursor/rules/",
      docs: "docs/CURSOR-PILOT-KIT.md · docs/COBOL-IBM-SDFHCOB-DROP.md",
      operator: "EXTFMAP sole P0 — ZD&T drop or prove ABSENT; never invent",
      fullProve: "pnpm run hub:cobol-clbs-prove-smoke (GCE preferred)",
    },
    steps,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main();
