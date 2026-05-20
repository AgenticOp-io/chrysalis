#!/usr/bin/env node
/**
 * Exercise fixtures/tiny-n1 through the Oracle (all routes in chrysalis.routes.json).
 * Used by CI rewrite-gate so sanitize-output / parameterize-sql passes have trace evidence.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadObserveConfig, readCorpus, startObserver } from "../packages/oracle/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/tiny-n1");
const traceDir = resolve(repo, "traces/tiny-n1-ci");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");

try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log("[drive-tiny-n1] php not on PATH — skipping");
  process.exit(0);
}

if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });

const fixtureDb = resolve(fixture, "blog.sqlite");
rmSync(fixtureDb, { force: true });
const seedDb = new DatabaseSync(fixtureDb);
seedDb.exec(readFileSync(resolve(fixture, "schema.sql"), "utf8"));
seedDb.exec(
  "INSERT INTO users (id, username, name) VALUES (1, 'alice', 'Alice'), (2, 'bob', 'Bob')",
);
seedDb.exec("INSERT INTO posts (id, author_id, title) VALUES (1, 1, 'p1'), (2, 2, 'p2')");
seedDb.exec("INSERT INTO comments (post_id, body) VALUES (1, 'hi'), (2, 'yo')");
seedDb.close();

const redaction = loadObserveConfig(fixture);
const port = 18081;
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
      const r = await fetch(`http://127.0.0.1:${port}/dashboard`);
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
  await fetch(`${base}/dashboard`);
  await fetch(`${base}/search?q=<script>alert(1)</script>`);
  await fetch(`${base}/lookup?id=1`);
  await fetch(`${base}/action`, {
    method: "POST",
    body: new URLSearchParams({ op: "ping" }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  await fetch(`${base}/register`, {
    method: "POST",
    body: new URLSearchParams({
      username: "u1",
      email: "u1@example.com",
      password: "secret",
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  console.log("[drive-tiny-n1] all routes exercised");
} finally {
  await handle.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[drive-tiny-n1] corpus: ${corpus.traces.length} traces`);
