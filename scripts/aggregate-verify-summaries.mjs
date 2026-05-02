#!/usr/bin/env node
/**
 * Merge **NDJSON** lines (stdin or files) and/or **one pretty-printed** **`chrysalis.verify.summary`**
 * per file into **`chrysalis.verify.summary.batch`** (**DESIGN D271**). Stdout only; no network.
 *
 *   node scripts/aggregate-verify-summaries.mjs a.ndjson b.ndjson
 *   node scripts/aggregate-verify-summaries.mjs reports/verify/summary-line.json
 *   type lines.ndjson | node scripts/aggregate-verify-summaries.mjs
 */
import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline";

const BATCH_KIND = "chrysalis.verify.summary.batch";
const BATCH_SV = 1;
const SUMMARY_KIND = "chrysalis.verify.summary";

/** @param {import("node:fs").ReadStream} stream */
async function linesFromStream(stream) {
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const out = [];
  for await (const line of rl) {
    const t = line.trim();
    if (t.length === 0) continue;
    out.push(t);
  }
  return out;
}

/**
 * @param {string} line
 * @param {string} label
 */
function parseSummaryLine(line, label) {
  let row;
  try {
    row = JSON.parse(line);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`aggregate-verify-summaries: invalid JSON (${label}): ${msg}`);
    process.exit(2);
  }
  if (!row || typeof row !== "object") {
    console.error(`aggregate-verify-summaries: expected object (${label})`);
    process.exit(2);
  }
  if (row.kind !== SUMMARY_KIND) {
    console.error(
      `aggregate-verify-summaries: expected kind ${JSON.stringify(SUMMARY_KIND)} (${label}), got ${JSON.stringify(row.kind)}`,
    );
    process.exit(2);
  }
  return row;
}

/**
 * @param {string} abs
 */
function summariesFromFileSync(abs) {
  const text = readFileSync(abs, "utf8");
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const one = JSON.parse(trimmed);
      if (one && typeof one === "object" && one.kind === SUMMARY_KIND) {
        return [one];
      }
    } catch {
      /* fall through: NDJSON lines */
    }
  }
  const items = [];
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    items.push(parseSummaryLine(line, `${abs}:${i + 1}`));
  }
  return items;
}

/** @param {string[]} argv */
async function main(argv) {
  const files = argv.slice(2).filter((a) => a.length > 0);
  const items = [];

  if (files.length === 0) {
    const stdinLines = await linesFromStream(process.stdin);
    for (let i = 0; i < stdinLines.length; i++) {
      items.push(parseSummaryLine(stdinLines[i], `stdin:${i + 1}`));
    }
  } else {
    for (const f of files) {
      const abs = resolve(f);
      items.push(...summariesFromFileSync(abs));
    }
  }

  const doc = {
    kind: BATCH_KIND,
    schemaVersion: BATCH_SV,
    wallTimeIso: new Date().toISOString(),
    itemCount: items.length,
    items,
  };
  process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
}

main(process.argv).catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
});
