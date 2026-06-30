#!/usr/bin/env node
/** Open web-LLM program entry gate (G8200). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const OPEN_WEB_LLM_ENTRY_KIND = "chrysalis.web-llm.entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export function runOpenWebLlmDocGate() {
  const program = join(scriptRoot, "docs/OPEN-WEB-LLM-PROGRAM.md");
  const benchmark = join(scriptRoot, "docs/WEB-VERIFY-BENCHMARK.md");
  if (!existsSync(program) || !existsSync(benchmark)) return { ok: false, skip: "missing-program-docs" };
  const text = readFileSync(program, "utf8");
  const bench = readFileSync(benchmark, "utf8");
  const ok =
    text.includes("G8200") &&
    text.includes("@chrysalis/web-llm") &&
    text.includes("verify-gated") &&
    bench.includes("Web Verify Benchmark");
  return { ok, programDocOk: ok };
}

export function runOpenWebLlmCharterGate() {
  const path = join(scriptRoot, "fixtures/web-llm/chrysalis.web-llm-charter.v1.json");
  if (!existsSync(path)) return { ok: false, skip: "missing-charter" };
  const json = JSON.parse(readFileSync(path, "utf8"));
  const ok =
    json.kind === "chrysalis.web-llm.charter" &&
    json.agenda === "website-management-creation-conversion" &&
    Array.isArray(json.inScope) &&
    Array.isArray(json.outOfScope);
  return { ok, charterOk: ok };
}

export async function runOpenWebLlmPackageGate() {
  const dist = join(scriptRoot, "packages/web-llm/dist/index.js");
  if (!existsSync(dist)) {
    const build = spawnSync("pnpm", ["--filter", "@chrysalis/web-llm", "build"], {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (build.status !== 0) {
      return { ok: false, skip: "web-llm-build-failed", detail: (build.stderr ?? "").slice(0, 300) };
    }
  }
  const mod = await loadWebLlm();
  const tools = mod.chrysalisAgentToolDefinitions();
  const policy = mod.evaluateVerifyGatePolicy({ gateOk: true, verifyCorrectness: 1, holeCount: 0 });
  const ok = tools.length >= 8 && policy.ok === true && mod.VERIFY_GATE_POLICY.defaultMinCorrectness === 1;
  return { ok, toolCount: tools.length, policyOk: policy.ok };
}

export async function runOpenWebLlmEntryGate() {
  const doc = runOpenWebLlmDocGate();
  const charter = runOpenWebLlmCharterGate();
  const pkg = await runOpenWebLlmPackageGate();
  const ok = doc.ok === true && charter.ok === true && pkg.ok === true;
  return {
    kind: OPEN_WEB_LLM_ENTRY_KIND,
    schemaVersion: 1,
    ok,
    doc,
    charter,
    pkg,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runOpenWebLlmEntryGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-open-web-llm-entry-smoke")) main();
