#!/usr/bin/env node
/** Phase 41b.5 — Python SQL/DB effect lowering (G8725). */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { exportPythonHubWebir } from "./hub-python-hub-webir.mjs";
import { walkHubWebirGoldenNodes, parseHubWebirGoldenFile } from "./hub-webir-golden-walk.mjs";

export const PYTHON_SEMANTIC_SQL_SMOKE_KIND = "chrysalis.python-semantic-sql-smoke";
export const PYTHON_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureRel = "fixtures/hub-python-semantic-sql";

/** G8725 — db.execute / cursor.execute lower to effect.db.query hole-free. */
export async function runPythonSemanticSqlB5Gate() {
  const fixture = join(scriptRoot, fixtureRel);
  const exported = await exportPythonHubWebir(fixture);
  if (exported.skip) {
    return { ok: false, skip: exported.skip };
  }
  const holeCount = exported.holeCount ?? 1;
  const webirPath = join(fixture, ".chrysalis/hub.python.webir.json");
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
  const dbQueryCount = dbQueries.length;
  const ok =
    exported.ok === true &&
    holeCount === 0 &&
    (exported.routeCount ?? 0) >= 2 &&
    dbQueryCount >= 2 &&
    hasItemsRead &&
    hasUsersRead;
  return {
    ok,
    holeCount,
    routeCount: exported.routeCount ?? 0,
    dbQueryCount,
    hasItemsRead,
    hasUsersRead,
    fixtureRel,
  };
}

export async function runPythonSemanticSqlSmoke() {
  const progress = createSmokeProgress("python-semantic-sql");
  const t0 = progress.start("Python semantic SQL (G8725)");
  const gate = await runPythonSemanticSqlB5Gate();
  progress.end("Python semantic SQL (G8725)", gate.ok === true, t0);
  return {
    kind: PYTHON_SEMANTIC_SQL_SMOKE_KIND,
    schemaVersion: PYTHON_SEMANTIC_SQL_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonSemanticSqlSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-semantic-sql-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
