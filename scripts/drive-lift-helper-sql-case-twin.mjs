#!/usr/bin/env node
/** Oracle capture for lift-helper-sql-case-twin (B5.4 v2). */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadObserveConfig, readCorpus, startObserver } from "../packages/oracle/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/lift-helper-sql-case-twin");
const traceDir = resolve(repo, "traces/lift-helper-sql-case-twin-ci");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");
const fixtureDb = resolve(fixture, "probe.sqlite");

try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log("[drive-lift-helper-sql-case-twin] php not on PATH — skipping");
  process.exit(0);
}

rmSync(fixtureDb, { force: true });
const seedDb = new DatabaseSync(fixtureDb);
seedDb.exec(readFileSync(resolve(fixture, "schema.sql"), "utf8"));
seedDb.close();

if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });

const redaction = loadObserveConfig(fixture);
const port = 18083;
const handle = startObserver({
  phpRoot: fixture,
  traceDir,
  preludePath,
  redaction,
  host: "127.0.0.1",
  port,
  onStderr: (s) => process.stderr.write(`[php] ${s}`),
});

async function waitUp() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/alpha`);
      if (r.status) return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("PHP dev server failed to come up within 3s");
}

try {
  await waitUp();
  const base = `http://127.0.0.1:${port}`;
  await fetch(`${base}/alpha`);
  await fetch(`${base}/beta`);
  console.log("[drive-lift-helper-sql-case-twin] exercised /alpha and /beta");
} finally {
  await handle.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[drive-lift-helper-sql-case-twin] corpus: ${corpus.traces.length} traces`);
