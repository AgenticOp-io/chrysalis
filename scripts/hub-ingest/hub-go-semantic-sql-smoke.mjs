#!/usr/bin/env node
/** Phase 41c.8 — Go database/sql SQL effect lowering (G8738). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const GO_SEMANTIC_SQL_SMOKE_KIND = "chrysalis.go-semantic-sql-smoke";
export const GO_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-go-semantic-sql";
const liftScript = join(scriptRoot, "scripts/hub-ingest/lift-to-webir.mjs");

/** G8738 — db.Query / QueryRow lower to effect.db.query hole-free. */
export function runGoSemanticSqlC8Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const lift = spawnSync(process.execPath, [liftScript, fixture, "--language", "go"], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (lift.status !== 0) {
    return { ok: false, skip: "lift-failed", stderr: lift.stderr?.slice(0, 400) };
  }
  let report;
  try {
    report = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}");
  } catch {
    return { ok: false, skip: "lift-json" };
  }
  const holeCount = report.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.go.webir.json");
  /** @type {{ sql: string, tables: string[], kind: string }[]} */
  const dbQueries = [];
  try {
    const mod = parseHubWebirGoldenFile(readFileSync(webirPath, "utf8"));
    walkHubWebirGoldenNodes(mod, (n) => {
      if (n.dialect === "effect" && n.op === "db.query" && n.attrs?.sql) {
        dbQueries.push({
          sql: String(n.attrs.sql),
          tables: Array.isArray(n.attrs.tables) ? n.attrs.tables.map(String) : [],
          kind: String(n.attrs.kind ?? ""),
        });
      }
    });
  } catch {
    return { ok: false, skip: "webir-read", holeCount };
  }
  const hasItemsRead = dbQueries.some(
    (q) => /select/i.test(q.sql) && q.tables.includes("items") && q.kind === "read",
  );
  const hasUsersRead = dbQueries.some(
    (q) => /select/i.test(q.sql) && q.tables.includes("users") && q.kind === "read",
  );
  const ok =
    holeCount === 0 &&
    (report.routeCount ?? 0) >= 2 &&
    dbQueries.length >= 2 &&
    hasItemsRead &&
    hasUsersRead;
  return {
    ok,
    holeCount,
    routeCount: report.routeCount ?? 0,
    dbQueryCount: dbQueries.length,
    hasItemsRead,
    hasUsersRead,
    fixtureRel,
  };
}

export async function runGoSemanticSqlSmoke() {
  const progress = createSmokeProgress("go-semantic-sql");
  const t0 = progress.start("Go semantic SQL (G8738)");
  const gate = runGoSemanticSqlC8Gate();
  progress.end("Go semantic SQL (G8738)", gate.ok === true, t0);
  return {
    kind: GO_SEMANTIC_SQL_SMOKE_KIND,
    schemaVersion: GO_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runGoSemanticSqlSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-go-semantic-sql-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
