#!/usr/bin/env node
/**
 * Smoke (D6601, exec mode): compile a real COBOL program with GnuCOBOL (cobc),
 * trace it via go-binary-trace --exec. Pass = /pay records evidence-backed 200,
 * /bad records 500. Skips (exit 0) when cobc is not on PATH.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const run = (c, a, o = {}) => spawnSync(c, a, { encoding: "utf8", timeout: 120_000, ...o });

if (run("cobc", ["--version"]).status !== 0) {
  console.error("hub:cobol-binary-smoke skipped: cobc not on PATH");
  process.exit(0);
}
const work = mkdtempSync(join(tmpdir(), "chrysalis-cobol-"));
try {
  const bin = join(work, process.platform === "win32" ? "pay.exe" : "pay");
  const cc = run("cobc", ["-x", "-free", "-o", bin, join(root, "fixtures/hub-cobol-exec/PAY.cbl")]);
  if (cc.status !== 0) throw new Error(`cobc: ${cc.stderr}`);
  const hole = "legacy:cobol-binary-handler-body";
  const routes = join(work, "routes.json");
  writeFileSync(routes, JSON.stringify({ routes: [
    { method: "POST", path: "/pay", holes: [hole] },
    { method: "GET", path: "/bad", holes: [hole] },
  ] }));
  const out = join(work, "traced.json");
  const t = run(process.execPath, [join(root, "scripts/hub-ingest/go-binary-trace.mjs"), bin, "--routes", routes, "--exec", "--out", out]);
  if (t.status !== 0) throw new Error(`trace: ${t.stderr}`);
  const by = new Map(JSON.parse(readFileSync(out, "utf8")).routes.map((r) => [r.path, r.observed]));
  const fail = [];
  if (by.get("/pay")?.status !== 200 || by.get("/pay")?.evidenceFor !== hole) fail.push("/pay not 200 with evidence");
  if (by.get("/bad")?.status !== 500) fail.push("/bad not 500");
  console.log(JSON.stringify({ kind: "chrysalis.hub.cobol-binary-smoke", ok: !fail.length, fail }, null, 2));
  if (fail.length) process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
