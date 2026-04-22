#!/usr/bin/env node
/**
 * Exercises the tiny-blog fixture end-to-end through the Oracle:
 *
 *   1. Starts `chrysalis observe` against fixtures/tiny-blog.
 *   2. Waits for the PHP built-in server to come up.
 *   3. Fires one request per route (all five).
 *   4. Shuts the server down.
 *   5. Reads the resulting NDJSON corpus and prints a summary.
 *
 * Requires PHP (>=7.4) to be installed and on PATH. If PHP is missing, the
 * script exits 0 after printing a friendly skip notice so a dev without PHP
 * isn't blocked on this.
 */

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadObserveConfig,
  readCorpus,
  startObserver,
} from "../packages/oracle/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixture = resolve(repo, "fixtures/tiny-blog");
const traceDir = resolve(repo, "traces");
const preludePath = resolve(repo, "packages/oracle-php/src/bootstrap.php");

// Detect PHP.
try {
  execSync("php --version", { stdio: "ignore" });
} catch {
  console.log(
    "[drive] php not found on PATH — skipping live drive. Install PHP >=7.4 to run this script.",
  );
  process.exit(0);
}

// Ensure a clean traces dir so corpus summary is meaningful.
if (existsSync(traceDir)) rmSync(traceDir, { recursive: true, force: true });
mkdirSync(traceDir, { recursive: true });

// Seed both the fixture's sqlite (which PHP reads) and the generated project's
// sqlite (so the same data flows through emit too).
console.log("[drive] seeding fixtures/tiny-blog/blog.sqlite + generated/...");
execSync("node scripts/seed-fixture-db.mjs", { cwd: repo, stdio: "inherit" });

// Compute a real bcrypt hash via the available PHP binary and patch the
// fixture DB so `password_verify('secret', $hash)` succeeds during the drive.
// Node doesn't ship bcrypt in stdlib; we already require PHP above, so use it.
const hash = execSync('php -r "echo password_hash(\'secret\', PASSWORD_BCRYPT);"', {
  cwd: repo,
}).toString().trim();
{
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(resolve(repo, "fixtures/tiny-blog/blog.sqlite"));
  db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hash, "alice");
  db.close();
  console.log(`[drive] patched alice's password hash (${hash.slice(0, 7)}...)`);
}

const redaction = loadObserveConfig(fixture);
console.log(`[drive] loaded ${redaction.rules.length} redaction rules from fixture`);

const port = 18080;
const handle = startObserver({
  phpRoot: fixture,
  traceDir,
  preludePath,
  redaction,
  host: "127.0.0.1",
  port,
  onStderr: (s) => process.stderr.write(`[php] ${s}`),
});

// Wait for the server to come up (cli-server prints a "Development Server started" line, but
// rather than race on stdout we just retry the first request).
async function waitUp() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      if (r.status) return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("PHP dev server failed to come up within 3s");
}

try {
  await waitUp();
  console.log(`[drive] PHP dev server up at ${handle.url}`);

  // Hit every route. Order matters for some: login → create post → create comment.
  await fetch(`http://127.0.0.1:${port}/`);
  await fetch(`http://127.0.0.1:${port}/posts/1`);

  const loginBody = new URLSearchParams({ username: "alice", password: "secret" });
  const login = await fetch(`http://127.0.0.1:${port}/login`, {
    method: "POST",
    body: loginBody,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    redirect: "manual",
  });
  const setCookie = login.headers.get("set-cookie") ?? "";
  const sessionCookie = (setCookie.match(/PHPSESSID=[^;]+/) ?? [""])[0];

  const postBody = new URLSearchParams({ title: "hello", body: "world" });
  await fetch(`http://127.0.0.1:${port}/posts`, {
    method: "POST",
    body: postBody,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: sessionCookie,
    },
    redirect: "manual",
  });

  const commentBody = new URLSearchParams({ post_id: "1", body: "nice!" });
  await fetch(`http://127.0.0.1:${port}/comments`, {
    method: "POST",
    body: commentBody,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: sessionCookie,
    },
    redirect: "manual",
  });

  console.log("[drive] all 5 routes exercised");
} finally {
  await handle.stop();
}

const corpus = readCorpus({ root: traceDir });
console.log(`[drive] corpus: ${corpus.traces.length} traces`);
const byRoute = new Map();
let totalSql = 0;
for (const t of corpus.traces) {
  const req = t.events.find((e) => e.type === "http.request");
  if (!req || req.type !== "http.request") continue;
  const k = `${req.method} ${req.path}`;
  byRoute.set(k, (byRoute.get(k) ?? 0) + 1);
  totalSql += t.events.filter((e) => e.type === "sql.query").length;
}
for (const [route, n] of [...byRoute.entries()].sort()) {
  console.log(`  ${route.padEnd(25)} ${n} trace(s)`);
}
console.log(`[drive] total SQL events captured: ${totalSql}`);
