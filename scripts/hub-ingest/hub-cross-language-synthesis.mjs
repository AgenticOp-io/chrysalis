#!/usr/bin/env node
/**
 * Export consolidated cross-language synthesis artifact for offline analysis.
 * Usage: node scripts/hub-ingest/hub-cross-language-synthesis.mjs [--json-out path]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BEST_PRACTICES,
  buildHubPathKnowledgeBase,
  profileForLanguage,
} from "./hub-path-knowledge.mjs";
import {
  HUB_WEB_ORIGIN_LANGUAGE_IDS,
  HUB_WEB_OUTPUT_LANGUAGE_IDS,
  LANGUAGE_LABELS,
} from "./language-catalog.mjs";
import { ingestLaneForOrigin } from "./hub-translation-paths.mjs";

export const HUB_CROSS_LANGUAGE_SYNTHESIS_KIND = "chrysalis.hub.cross-language-synthesis";
export const HUB_CROSS_LANGUAGE_SYNTHESIS_SCHEMA_VERSION = 1;

/** Cross-language feature rows for consolidation planning. */
export const FEATURE_MATRIX = [
  {
    id: "http-route",
    label: "HTTP route registration",
    php: "full",
    javascript: "ast",
    typescript: "ast",
    python: "ast",
    java: "ast",
    go: "ast",
    ruby: "pattern",
    csharp: "pattern",
    kotlin: "pattern",
    rust: "pattern",
    scala: "pattern",
    swift: "pattern",
      vue: "pattern",
      cwl: "native",
      default: "file-or-hole",
    },
  {
    id: "literal-response",
    label: "Literal handler response",
    php: "full",
    javascript: "gold",
    typescript: "gold",
    python: "gold",
    java: "partial",
    go: "partial",
    default: "hole",
  },
  {
    id: "structured-json-body",
    label: "Structured JSON/object return",
    php: "full",
    javascript: "gold",
    typescript: "gold",
    python: "gold",
    cwl: "native",
    default: "hole",
  },
  {
    id: "middleware",
    label: "Middleware / pipeline",
    php: "partial",
    javascript: "partial",
    typescript: "partial",
    default: "hole",
  },
  {
    id: "sql-db-effects",
    label: "SQL / database effects",
    php: "partial-effects",
    default: "hole",
  },
  {
    id: "session-auth",
    label: "Session and auth",
    php: "partial",
    default: "hole",
  },
  {
    id: "trace-oracle",
    label: "Trace capture + replay",
    php: "legacy-oracle-php",
    javascript: "hub-gold-replay",
    typescript: "hub-gold-replay",
    python: "hub-gold-replay",
    cwl: "hub-gold-replay",
    default: "none",
  },
  {
    id: "cwl-direct-ingest",
    label: "CWL direct WebIR ingest",
    cwl: "native",
    default: "n/a",
  },
];

/** Ten consolidation primitives (WebIR-aligned). */
export const CONSOLIDATION_PRIMITIVES = [
  { id: "HTTP.Route", fields: ["method", "pathTemplate", "handlerId", "provenance"] },
  { id: "HTTP.Handler", fields: ["inputs", "outputs", "effects", "body"] },
  { id: "HTTP.Request", fields: ["method", "path", "query", "headers", "cookies", "body", "session"] },
  { id: "HTTP.Response", fields: ["status", "headers", "body"] },
  { id: "Effect.Set", fields: ["io", "db", "session", "mail"] },
  { id: "Hole.Ref", fields: ["reason", "inputType", "outputType", "provenance"] },
  { id: "Literal.Value", fields: ["scalar", "structuredMap"] },
  { id: "Context.Inject", fields: ["time", "random", "envPolicy"] },
  { id: "Trace.Frame", fields: ["request", "response", "determinism"] },
  { id: "Contract.API", fields: ["openapi", "har", "composeTarget"] },
  { id: "CWL.Module", fields: ["name", "routes", "provenance"] },
  { id: "CWL.Handler", fields: ["effects", "return", "hole"] },
];

/**
 * @param {string} row
 * @param {string} lang
 */
function featureLevel(row, lang) {
  if (row[lang]) return row[lang];
  return row.default ?? "unknown";
}

export function buildCrossLanguageSynthesis() {
  const knowledge = buildHubPathKnowledgeBase();
  const webDatabases = knowledge.webDatabaseCatalog;
  const origins = HUB_WEB_ORIGIN_LANGUAGE_IDS.map((id) => ({
    id,
    label: LANGUAGE_LABELS[id] ?? id,
    ingestLane: ingestLaneForOrigin(id),
    profile: profileForLanguage(id, "origin"),
    features: Object.fromEntries(FEATURE_MATRIX.map((row) => [row.id, featureLevel(row, id)])),
  }));

  const outputs = HUB_WEB_OUTPUT_LANGUAGE_IDS.map((id) => ({
    id,
    label: LANGUAGE_LABELS[id] ?? id,
    profile: profileForLanguage(id, "output"),
  }));

  const goldPairs = knowledge.pairs.filter((p) => p.grade === "gold").map((p) => ({
    origin: p.origin,
    output: p.output,
    ingestLane: p.pathRef.ingestLane,
    emitLane: p.pathRef.emitLane,
    verifyLanes: p.pathRef.verifyLanes,
  }));

  return {
    kind: HUB_CROSS_LANGUAGE_SYNTHESIS_KIND,
    schemaVersion: HUB_CROSS_LANGUAGE_SYNTHESIS_SCHEMA_VERSION,
    stepsDocument: "docs/HUB-CROSS-LANGUAGE-SYNTHESIS.md",
    cwlSpec: "docs/CWL.md",
    mission:
      "Comprehensive map of web language translation paths including CWL (Chrysalis Web Language), the WebIR-native consolidation surface.",
    universe: {
      originCount: HUB_WEB_ORIGIN_LANGUAGE_IDS.length,
      outputCount: HUB_WEB_OUTPUT_LANGUAGE_IDS.length,
      pairCount: knowledge.pairCount,
    },
    consolidationPrimitives: CONSOLIDATION_PRIMITIVES,
    featureMatrix: FEATURE_MATRIX,
    origins,
    outputs,
    originClusters: knowledge.originClusters,
    webDatabaseCatalog: webDatabases,
    laneComparisons: knowledge.laneComparisons,
    bestPractices: BEST_PRACTICES,
    gradeSummary: knowledge.summary.byGrade,
    goldPairs,
    pairKnowledgeRef: "reports/ci/hub-path-knowledge.json",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  let jsonOut = null;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--json-out" && process.argv[i + 1]) jsonOut = resolve(process.argv[++i]);
  }
  const payload = buildCrossLanguageSynthesis();
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
