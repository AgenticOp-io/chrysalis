import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";

export const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let jsonOut = null;
  let listSmokes = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--list-smokes") listSmokes = true;
  }
  return { jsonOut, listSmokes };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("no JSON object in subprocess stdout");
  }
}

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let parsed = {};
  try {
    parsed = parseStdoutJson(r.stdout);
  } catch {
    parsed = {};
  }
  if ((r.status ?? 1) !== 0 && parsed.ok !== true && r.stderr?.trim()) {
    try {
      parsed = parseStdoutJson(r.stderr);
    } catch {
      /* keep stdout parse */
    }
  }
  return { status: r.status ?? 1, parsed, stderr: r.stderr };
}

/** Reuse gce-hub-gold-gates.sh artifacts when hub-completion runs under GCE fast path. */
async function loadGoldAndTraceReplay(gceFast) {
  const goldArtifact = join(scriptRoot, "reports/ci/gce-gold-verify.json");
  const traceArtifact = join(scriptRoot, "reports/ci/gce-trace-replay.json");
  if (gceFast && existsSync(goldArtifact) && existsSync(traceArtifact)) {
    console.error(
      "[hub-completion] GCE fast: reusing gce-gold-gates artifacts (skip duplicate gold/trace run)",
    );
    const goldText = await readFile(goldArtifact, "utf8");
    const traceText = await readFile(traceArtifact, "utf8");
    const goldParsed = parseStdoutJson(goldText);
    const traceParsed = parseStdoutJson(traceText);
    return {
      gold: {
        status: goldParsed.ok === true ? 0 : 1,
        parsed: goldParsed,
        stderr: "",
      },
      traceReplay: {
        status: traceParsed.ok === true ? 0 : 1,
        stdout: traceText,
        stderr: "",
      },
      traceParsed,
    };
  }

  if (gceFast) {
    console.error(
      "[hub-completion] GCE fast: no gce-gold-gates artifacts at reports/ci/gce-gold-verify.json and gce-trace-replay.json — running full gold + trace replay (slow; run scripts/gce-hub-gold-gates.sh first to reuse)",
    );
  }
  console.error("[hub-completion] phase: hub-gold-verify");
  const gold = runJson(join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), []);
  console.error("[hub-completion] phase: hub-gold-trace-replay");
  const traceReplay = spawnSync(
    process.execPath,
    ["--import", "tsx", join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs")],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  let traceParsed = {};
  try {
    traceParsed = parseStdoutJson(traceReplay.stdout);
  } catch {
    try {
      traceParsed = parseStdoutJson(traceReplay.stderr ?? "");
    } catch {
      traceParsed = {};
    }
  }
  return { gold, traceReplay, traceParsed };
}

function summarizeRouteGrades() {
  const counts = { gold: 0, silver: 0, open: 0 };
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const g = HUB_ROUTES[`${src.id}:${out.id}`]?.grade ?? "open";
      if (g === "gold") counts.gold += 1;
      else if (g === "silver") counts.silver += 1;
      else counts.open += 1;
    }
  }
  return counts;
}

export { parseArgs, parseStdoutJson, runJson, loadGoldAndTraceReplay, summarizeRouteGrades };
