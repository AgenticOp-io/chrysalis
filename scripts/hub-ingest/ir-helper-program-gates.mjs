#!/usr/bin/env node
/** IR Helper Program gates — doc + coverage (G7200 helpers). */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");
const PARAM_INLINE_FIXTURE = join(scriptRoot, "fixtures/lift-helper-sql-param-inline");

function parseIngestSummary(stdout) {
  const nodesMatch = stdout.match(/^nodes:\s+(\d+)/m);
  const holesMatch = stdout.match(/^holes:\s+(\d+)/m);
  return {
    nodes: nodesMatch ? Number(nodesMatch[1]) : null,
    holes: holesMatch ? Number(holesMatch[1]) : null,
  };
}

function ingestFixtureOnce(fixturePath, extraFlags = []) {
  const r = spawnSync(process.execPath, [cliBin, "ingest", fixturePath, ...extraFlags], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const summary = parseIngestSummary(r.stdout ?? "");
  return {
    ok: (r.status ?? 1) === 0 && summary.holes === 0,
    exitCode: r.status ?? 1,
    ...summary,
  };
}

/** G7204 — ingest idempotency on param-inline fixture (same nodes/holes twice). */
export function runIrHelperProgramIdempotencyGate() {
  if (!existsSync(cliBin)) return { ok: false, skip: "no-cli-bin" };
  const flags = ["--ingest-dedupe-structural-subgraphs"];
  const a = ingestFixtureOnce(PARAM_INLINE_FIXTURE, flags);
  const b = ingestFixtureOnce(PARAM_INLINE_FIXTURE, flags);
  const ok =
    a.ok &&
    b.ok &&
    a.nodes !== null &&
    b.nodes !== null &&
    a.holes === b.holes &&
    a.nodes === b.nodes;
  return { ok, first: a, second: b };
}

/** Write chrysalis.ir-helper-program-coverage.json (Axis C artifact). */
export async function writeIrHelperProgramCoverageArtifact(outPath) {
  const catalogPath = join(scriptRoot, "packages/emit-shared/dist/ir-helper-program-catalog.js");
  if (!existsSync(catalogPath)) return { ok: false, skip: "missing-emit-shared-dist-catalog" };
  const mod = await import(pathToFileURL(catalogPath).href);
  const coverage = mod.buildIrHelperProgramCoverage();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ ...coverage, generatedAt: new Date().toISOString() }, null, 2));
  return { ok: true, path: outPath, inlineCalleeCount: coverage.inlineCalleeCount };
}

/** G7201 — IR Helper Program doc indexes close gate and decouples from CWL language. */
export function runIrHelperProgramDocGate() {
  const programPath = join(scriptRoot, "docs/IR-HELPER-PROGRAM.md");
  const liftingPath = join(scriptRoot, "docs/IR-HELPER-LIFTING.md");
  const pausedPath = join(scriptRoot, "docs/PAUSED-AND-MAINTENANCE.md");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  if (!existsSync(programPath)) return { ok: false, skip: "missing-ir-helper-program-doc" };
  const program = readFileSync(programPath, "utf8");
  const lifting = existsSync(liftingPath) ? readFileSync(liftingPath, "utf8") : "";
  const paused = existsSync(pausedPath) ? readFileSync(pausedPath, "utf8") : "";
  const strategic = existsSync(strategicPath) ? readFileSync(strategicPath, "utf8") : "";
  const ok =
    program.includes("G7200") &&
    program.includes("Program v1 closed") &&
    program.includes("IR_HELPER_INLINE_REGISTRY") &&
    program.includes("G6731") &&
    program.includes("Regression only") &&
    lifting.includes("IR-HELPER-PROGRAM.md") &&
    paused.includes("G7200") &&
    strategic.includes("hub:ir-helper-program-close-smoke");
  return { ok, programDocOk: ok };
}

/** G7202 — inline fixture coverage matches catalog (102 I3 callees). */
export async function runIrHelperProgramCoverageGate() {
  const catalogPath = join(scriptRoot, "packages/emit-shared/dist/ir-helper-program-catalog.js");
  if (!existsSync(catalogPath)) {
    return { ok: false, skip: "missing-emit-shared-dist-catalog" };
  }
  const libDir = join(scriptRoot, "fixtures/lift-helper-sql-param-inline/lib");
  if (!existsSync(libDir)) return { ok: false, skip: "missing-param-inline-fixture" };

  const mod = await import(pathToFileURL(catalogPath).href);
  const expected = mod.IR_HELPER_INLINE_CALLEE_IDS.length;
  const ids = mod.IR_HELPER_INLINE_CALLEE_IDS;

  const fixtureFiles = readdirSync(libDir).filter((f) => f.startsWith("sql_param_") && f.endsWith(".php"));
  const fixtureIds = new Set(
    fixtureFiles.map((f) => {
      const base = f.replace(/^sql_param_/, "").replace(/\.php$/, "");
      return `chrysalis_sql_param_${base}`;
    }),
  );

  const missingFixtures = ids.filter((id) => !fixtureIds.has(id));
  const catalogOk = missingFixtures.length === 0 && expected === 102;

  const r = spawnSync(
    "pnpm",
    ["exec", "vitest", "run", "packages/emit-shared/tests/ir-helper-program-catalog.test.ts"],
    { cwd: scriptRoot, encoding: "utf8", shell: true, timeout: 120_000 },
  );

  return {
    ok: catalogOk && r.status === 0,
    expectedInlineCallees: expected,
    missingFixtures,
    vitestOk: r.status === 0,
  };
}

/** G7203 — single Vitest batch for Track B inline tests. */
export function runIrHelperProgramInlineVitestGate() {
  const r = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "packages/ingest/tests/lift-helper-sql-param-inline.test.ts",
      "packages/emit-shared/tests/lib-helper-inline.test.ts",
      "packages/emit-shared/tests/ir-helper-program-catalog.test.ts",
    ],
    { cwd: scriptRoot, encoding: "utf8", shell: true, timeout: 300_000 },
  );
  return { ok: r.status === 0, vitestOk: r.status === 0, exitCode: r.status ?? null };
}
