#!/usr/bin/env node
/** Pattern-lift literal → CWL → re-lift roundtrip gold batch (G523). */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_CWL_PATTERN_LITERAL_ROUNDTRIP_BATCH_KIND = "chrysalis.hub.cwl-pattern-literal-roundtrip-batch-smoke";
export const HUB_CWL_PATTERN_LITERAL_ROUNDTRIP_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const goldScript = join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs");

/** @type {readonly string[]} */
export const PATTERN_LITERAL_CWL_ROUNDTRIP_SUITES = [
  "js-literal-cwl",
  "ts-literal-cwl",
  "python-literal-cwl",
  "vue-literal-cwl",
  "sql-literal-cwl",
  "html-literal-cwl",
  "json-literal-cwl",
  "css-literal-cwl",
  "scss-literal-cwl",
  "markdown-literal-cwl",
  "yaml-literal-cwl",
  "c-literal-cwl",
  "cpp-literal-cwl",
  "java-literal-cwl",
  "go-literal-cwl",
  "csharp-literal-cwl",
  "ruby-literal-cwl",
  "kotlin-literal-cwl",
  "scala-literal-cwl",
  "swift-literal-cwl",
  "rust-literal-cwl",
];

function parseGoldVerifyJson(stdout) {
  const text = (stdout ?? "").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return {};
      }
    }
  }
  return {};
}

export function runCwlPatternLiteralRoundtripBatchSmoke() {
  const results = [];
  let ok = true;
  for (const suiteId of PATTERN_LITERAL_CWL_ROUNDTRIP_SUITES) {
    const r = spawnSync(process.execPath, [goldScript, "--suite", suiteId], {
      cwd: scriptRoot,
      encoding: "utf8",
    });
    const parsed = parseGoldVerifyJson(r.stdout);
    const roundTripOk =
      parsed.results?.every((entry) => entry.ok === true && entry.roundTrip != null) ?? false;
    const suiteOk = r.status === 0 && parsed.ok === true && roundTripOk;
    if (!suiteOk) ok = false;
    results.push({ suiteId, ok: suiteOk });
  }
  return {
    kind: HUB_CWL_PATTERN_LITERAL_ROUNDTRIP_BATCH_KIND,
    schemaVersion: HUB_CWL_PATTERN_LITERAL_ROUNDTRIP_BATCH_SCHEMA_VERSION,
    ok,
    suiteCount: PATTERN_LITERAL_CWL_ROUNDTRIP_SUITES.length,
    results,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runCwlPatternLiteralRoundtripBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
