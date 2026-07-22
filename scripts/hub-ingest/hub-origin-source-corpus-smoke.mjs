#!/usr/bin/env node
/**
 * G9993 — Origin source corpus + convert queue exist (DESIGN D6444).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(scriptRoot, "reports/origin-corpus");
const jsonPath = join(outDir, "chrysalis.source-corpus.v1.json");
const sqlitePath = join(outDir, "chrysalis.source-corpus.v1.sqlite");
const queuePath = join(outDir, "chrysalis.convert-queue.v1.json");

const build = spawnSync(process.execPath, [join(scriptRoot, "scripts/build-origin-source-corpus.mjs")], {
  cwd: scriptRoot,
  encoding: "utf8",
  env: process.env,
  maxBuffer: 32 * 1024 * 1024,
});
if (build.status !== 0) {
  console.error(build.stderr || build.stdout);
  process.exit(1);
}

const summary = JSON.parse(readFileSync(jsonPath, "utf8"));
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
if (summary.kind !== "chrysalis.source-corpus") throw new Error("bad corpus kind");
if (summary.stats.fileCount < 100) throw new Error(`fileCount too low: ${summary.stats.fileCount}`);
if (summary.stats.pieceCount < 10) throw new Error(`pieceCount too low: ${summary.stats.pieceCount}`);
if (!existsSync(sqlitePath)) throw new Error("missing sqlite");
if (queue.kind !== "chrysalis.convert-queue" || !Array.isArray(queue.next) || queue.next.length < 1) {
  throw new Error("bad convert queue");
}

const db = new DatabaseSync(sqlitePath, { readOnly: true });
const fileRows = db.prepare("SELECT COUNT(*) AS n FROM files").get();
const pieceRows = db.prepare("SELECT COUNT(*) AS n FROM pieces").get();
db.close();
if (Number(fileRows.n) !== summary.stats.fileCount) {
  throw new Error(`sqlite files ${fileRows.n} != summary ${summary.stats.fileCount}`);
}
if (Number(pieceRows.n) < 10) throw new Error("sqlite pieces too low");

console.log(
  JSON.stringify(
    {
      kind: "chrysalis.hub.origin-source-corpus-smoke",
      ok: true,
      fileCount: summary.stats.fileCount,
      pieceCount: summary.stats.pieceCount,
      sqliteFiles: fileRows.n,
      next: queue.next.slice(0, 5).map((p) => p.id),
    },
    null,
    2,
  ),
);
