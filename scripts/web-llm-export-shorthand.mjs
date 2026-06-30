#!/usr/bin/env node
/** Export verify-gated intelligence shorthands (IS-T3/T4/T5) — CPU only, no GPU. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openLegacyIndexEntries } from "./site-port-federation-lib.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const INTELLIGENCE_SHORTHAND_EXPORT_KIND = "chrysalis.web-llm.intelligence-shorthand-export";
export const INTELLIGENCE_SHORTHAND_EXPORT_SCHEMA_VERSION = 1;

async function loadWebLlm() {
  const dist = join(scriptRoot, "packages/web-llm/dist/index.js");
  return import(pathToFileURL(dist).href);
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readShardBundle(path) {
  const doc = readJson(path);
  if (!doc) return [];
  if (Array.isArray(doc.shards)) return doc.shards;
  if (doc.kind?.includes("training-shard")) return doc.shards ?? [];
  return [];
}

function readJsonlShards(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/**
 * @param {object} [opts]
 */
export async function exportIntelligenceShorthands(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  /** @type {Map<string, import('@chrysalis/web-llm').IntelligenceShorthand>} */
  const byId = new Map();

  function add(sh) {
    if (!sh) return;
    const val = mod.validateIntelligenceShorthand(sh);
    if (val.ok) byId.set(sh.id, sh);
  }

  const examplePath = join(repoRoot, "fixtures/web-llm/intelligence-shorthand.example.v1.json");
  add(readJson(examplePath));

  const shardSources = [
    join(repoRoot, "reports/web-llm/dataset/site-port/training-shards.v1.json"),
    join(repoRoot, "reports/web-llm/dataset/training-shards.v1.json"),
    join(repoRoot, "reports/federation/corpus/training-shards.v1.json"),
    ...(opts.shardPath ? [resolve(opts.shardPath)] : []),
  ];
  for (const path of shardSources) {
    for (const shard of readShardBundle(path)) {
      add(
        mod.buildSkillCapsuleFromShard(shard, {
          domainId: shard.sessionId,
          provenance: ["chrysalis.web-llm.export-shorthand"],
        }),
      );
    }
  }
  const jsonlPath = join(repoRoot, "reports/federation/corpus/training-shards.v1.jsonl");
  for (const shard of readJsonlShards(jsonlPath)) {
    add(
      mod.buildSkillCapsuleFromShard(shard, {
        domainId: shard.sessionId,
        provenance: ["chrysalis.web-llm.export-shorthand.corpus-jsonl"],
      }),
    );
  }

  const entries = openLegacyIndexEntries(repoRoot);
  for (const entry of entries) {
    const portPath = join(repoRoot, entry.fixtureRel, ".chrysalis", "site-port.json");
    const portReport = readJson(portPath);
    if (!portReport) continue;
    const policyRef = portReport.cwl?.cwlPath ?? join(entry.fixtureRel, "routes.cwl");
    add(
      mod.buildPolicyGraphShorthandFromPortReport(entry.id, portReport, {
        policyRef,
        provenance: ["chrysalis.web-llm.export-shorthand.port-report"],
      }),
    );
    add(
      mod.buildOracleRefShorthandFromPortReport(entry.id, portReport, {
        provenance: ["chrysalis.web-llm.export-shorthand.port-report"],
      }),
    );
  }

  const shorthands = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const summary = mod.summarizeIntelligenceShorthands(shorthands);

  const outDir = join(repoRoot, "reports/web-llm/shorthand");
  const federationDir = join(repoRoot, "reports/federation/shorthand");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(federationDir, { recursive: true });

  const bundle = {
    kind: INTELLIGENCE_SHORTHAND_EXPORT_KIND,
    schemaVersion: INTELLIGENCE_SHORTHAND_EXPORT_SCHEMA_VERSION,
    count: shorthands.length,
    summary,
    shorthands,
    indexEntryCount: entries.length,
    generatedAt: new Date().toISOString(),
  };

  const jsonPath = join(outDir, "intelligence-shorthands.v1.json");
  const jsonlOut = join(outDir, "intelligence-shorthands.v1.jsonl");
  const federationPath = join(federationDir, "intelligence-shorthands.v1.json");
  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  writeFileSync(
    jsonlOut,
    shorthands.map((s) => JSON.stringify(s)).join("\n") + (shorthands.length ? "\n" : ""),
    "utf8",
  );
  writeFileSync(federationPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const ok =
    shorthands.length >= 1 &&
    summary.byTier["IS-T4-policy-graph"] >= 1 &&
    summary.byTier["IS-T5-oracle-ref"] >= 1;

  return {
    kind: INTELLIGENCE_SHORTHAND_EXPORT_KIND,
    schemaVersion: INTELLIGENCE_SHORTHAND_EXPORT_SCHEMA_VERSION,
    ok,
    count: shorthands.length,
    summary,
    shorthands,
    jsonPath,
    jsonlPath: jsonlOut,
    federationPath,
    indexEntryCount: entries.length,
  };
}

async function main() {
  const report = await exportIntelligenceShorthands();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
