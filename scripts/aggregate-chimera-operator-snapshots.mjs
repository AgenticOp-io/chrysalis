#!/usr/bin/env node
/**
 * Merge one or more **NDJSON** files (or **stdin**) of **`chrysalis.chimera.operator-snapshot`**
 * lines into a single **`chrysalis.chimera.operator-snapshot.batch`** JSON document (**DESIGN D259**).
 * No network; stdout only.
 *
 *   node scripts/aggregate-chimera-operator-snapshots.mjs a.ndjson b.ndjson
 *   type a.ndjson | node scripts/aggregate-chimera-operator-snapshots.mjs
 */
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline";
const BATCH_KIND = "chrysalis.chimera.operator-snapshot.batch";
const BATCH_SV = 1;
const SNAPSHOT_KIND = "chrysalis.chimera.operator-snapshot";

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

/** @param {string} path */
async function linesFromFile(path) {
  return linesFromStream(createReadStream(path, { encoding: "utf8" }));
}

/** @param {string[]} argv */
async function main(argv) {
  const files = argv.slice(2).filter((a) => a.length > 0);
  const allLines = [];
  if (files.length === 0) {
    const stdinLines = await linesFromStream(process.stdin);
    allLines.push(...stdinLines);
  } else {
    for (const f of files) {
      const abs = resolve(f);
      allLines.push(...(await linesFromFile(abs)));
    }
  }

  const items = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    let row;
    try {
      row = JSON.parse(line);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`aggregate-chimera-operator-snapshots: invalid JSON on line ${i + 1}: ${msg}`);
      process.exit(2);
    }
    if (!row || typeof row !== "object") {
      console.error(`aggregate-chimera-operator-snapshots: expected object on line ${i + 1}`);
      process.exit(2);
    }
    if (row.kind !== SNAPSHOT_KIND) {
      console.error(
        `aggregate-chimera-operator-snapshots: expected kind ${JSON.stringify(SNAPSHOT_KIND)} (line ${i + 1})`,
      );
      process.exit(2);
    }
    items.push(row);
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
