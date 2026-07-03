#!/usr/bin/env node
/** Phase 41a.3 — JavaScript SQL/DB effect lowering (G8713). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const JS_SEMANTIC_SQL_SMOKE_KIND = "chrysalis.js-semantic-sql-smoke";
export const JS_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-js-semantic-sql";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

function parseLiftStdout(stdout) {
  const text = stdout.trim();
  const line = text.split("\n").pop() ?? "{}";
  return JSON.parse(line);
}

/** G8713 — db.query / pool.query lower to effect.db.query hole-free on gold fixture. */
export function runJsSemanticSqlB3Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const r = spawnSync(process.execPath, [liftScript, fixture, "--language", "javascript"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: r.stderr?.slice(0, 500) };
  }
  let report;
  try {
    report = parseLiftStdout(r.stdout);
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.javascript.webir.json");
  /** @type {{ sql: string, tables: string[], kind: string }[]} */
  const dbQueries = [];
  try {
    const mod = JSON.parse(readFileSync(webirPath, "utf8"));
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (n.dialect === "effect" && n.op === "db.query" && n.attrs?.sql) {
        dbQueries.push({
          sql: String(n.attrs.sql),
          tables: Array.isArray(n.attrs.tables) ? n.attrs.tables.map(String) : [],
          kind: String(n.attrs.kind ?? ""),
        });
      }
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(mod);
  } catch {
    return { ok: false, skip: "webir-read", holeCount };
  }
  const hasItemsRead = dbQueries.some(
    (q) => /select/i.test(q.sql) && q.tables.includes("items") && q.kind === "read",
  );
  const hasUsersRead = dbQueries.some(
    (q) => /select/i.test(q.sql) && q.tables.includes("users") && q.kind === "read",
  );
  const dbQueryCount = dbQueries.length;
  const ok =
    holeCount === 0 &&
    (report.routeCount ?? 0) >= 2 &&
    dbQueryCount >= 2 &&
    hasItemsRead &&
    hasUsersRead;
  return {
    ok,
    holeCount,
    routeCount: report.routeCount ?? 0,
    dbQueryCount,
    hasItemsRead,
    hasUsersRead,
    fixtureRel,
  };
}

export async function runJsSemanticSqlSmoke(opts = {}) {
  const progress = createSmokeProgress("js-semantic-sql");
  const t0 = progress.start("JS semantic SQL (G8713)");
  const gate = runJsSemanticSqlB3Gate();
  progress.end("JS semantic SQL (G8713)", gate.ok === true, t0);
  return {
    kind: JS_SEMANTIC_SQL_SMOKE_KIND,
    schemaVersion: JS_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runJsSemanticSqlSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-js-semantic-sql-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
