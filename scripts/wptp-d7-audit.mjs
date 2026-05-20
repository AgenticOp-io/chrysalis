#!/usr/bin/env node
/**
 * WPTP D7 quarterly audit helper (local + CI operator checklist).
 * See docs/WPTP-D7-ONGOING.md. Exits 0 when Chrysalis-local checks pass;
 * warns (does not fail) when sibling repos or network harnesses are absent.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

const WPTP_WORKFLOWS = [
  "webir-bundle-to-wptp-ir.yml",
  "wptp-d3-harness.yml",
  "wptp-d4-harness.yml",
  "wptp-silver-nextjs-harness.yml",
  "wptp-harness-smoke.yml",
];

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    const err = e;
    return {
      ok: false,
      out: String(err.stdout ?? "").trim(),
      err: String(err.stderr ?? err.message ?? "").trim(),
    };
  }
}

const report = {
  schema: "chrysalis/wptp-d7-audit/1",
  generatedAt: new Date().toISOString(),
  repo,
  checks: [],
};

function record(id, ok, detail) {
  report.checks.push({ id, ok, detail });
  const mark = ok ? "OK" : "WARN";
  console.log(`[wptp-d7-audit] ${mark} ${id}: ${detail}`);
}

// 1 — Chrysalis parser parity (Lane A)
const nikic = run("pnpm exec vitest run packages/parser-bridge/tests/nikic.test.ts");
record("chrysalis.parser-bridge.nikic", nikic.ok, nikic.ok ? "nikic parity tests passed" : nikic.err.slice(0, 200));

// 2 — WebIR → WPTP IR smoke (in-repo)
const bundleScript = join(repo, "scripts/verify-webir-bundle-wptp-ir.mjs");
const wptpIrRoot = process.env.WPTP_IR_ROOT ?? resolve(repo, "../wptp-ir");
const bundleOut = join(repo, "reports/ci/tiny-blog.webir.bundle.json");
if (!existsSync(bundleScript)) {
  record("chrysalis.webir-bundle-wptp-ir", false, "script missing");
} else if (!existsSync(join(wptpIrRoot, "package.json"))) {
  record("chrysalis.webir-bundle-wptp-ir", true, `skipped (no wptp-ir at ${wptpIrRoot})`);
} else {
  const exportBundle = run("pnpm run export:webir-bundle:tiny-blog");
  if (!exportBundle.ok) {
    record("chrysalis.webir-bundle-export", false, exportBundle.err.slice(0, 200));
  } else {
    const bundle = run("node --import tsx scripts/verify-webir-bundle-wptp-ir.mjs", {
      env: { ...process.env, WPTP_IR_ROOT: wptpIrRoot, WEBIR_BUNDLE_PATH: bundleOut },
    });
    record(
      "chrysalis.webir-bundle-wptp-ir",
      bundle.ok,
      bundle.ok ? "tiny-blog bundle import OK" : bundle.err.slice(0, 200),
    );
  }
}

// 3 — WPTP workflow files present
const wfDir = join(repo, ".github/workflows");
let wfOk = true;
for (const f of WPTP_WORKFLOWS) {
  if (!existsSync(join(wfDir, f))) {
    wfOk = false;
    record(`chrysalis.workflow.${f}`, false, "missing");
  }
}
if (wfOk) {
  record("chrysalis.wptp-workflows", true, WPTP_WORKFLOWS.join(", "));
}

// 4 — Sibling wptp-matrix (optional)
const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? resolve(repo, "../wptp-matrix");
if (existsSync(join(matrixRoot, "package.json"))) {
  const validate = run("npm run validate", { cwd: matrixRoot });
  record("wptp-matrix.validate", validate.ok, validate.ok ? matrixRoot : validate.err.slice(0, 200));
} else {
  record("wptp-matrix.validate", true, `skipped (no checkout at ${matrixRoot})`);
}

// 5 — ROADMAP honesty pointer
record(
  "docs.wptp-d7-playbook",
  existsSync(join(repo, "docs/WPTP-D7-ONGOING.md")),
  "docs/WPTP-D7-ONGOING.md",
);

const failed = report.checks.filter((c) => !c.ok && !c.id.includes("skipped"));
const outPath = process.argv.find((a) => a.startsWith("--json-out="))?.slice("--json-out=".length);
if (outPath) {
  const abs = resolve(outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[wptp-d7-audit] wrote ${abs}`);
}

console.log(`[wptp-d7-audit] summary: ${report.checks.filter((c) => c.ok).length}/${report.checks.length} OK`);
if (failed.length > 0) {
  process.exit(1);
}
