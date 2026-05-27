/**
 * Translation Hub path knowledge base: differences, similarities, and best practices
 * for every origin×output web language pair (derived from path matrix + catalog).
 */
import {
  HUB_WEB_ORIGIN_LANGUAGE_IDS,
  HUB_WEB_OUTPUT_LANGUAGE_IDS,
  LANGUAGE_LABELS,
  popularityRank,
} from "./language-catalog.mjs";
import {
  HUB_EMIT_LANES,
  HUB_INGEST_LANES,
  HUB_VERIFY_LANES,
  buildHubTranslationPathMatrix,
  describeTranslationPath,
  ingestLaneForOrigin,
} from "./hub-translation-paths.mjs";
import { buildPairTraits } from "./hub-path-traits.mjs";
import { buildWebDatabaseCatalogReport } from "./hub-web-databases.mjs";

export const HUB_PATH_KNOWLEDGE_KIND = "chrysalis.translation-hub.path-knowledge";
export const HUB_PATH_KNOWLEDGE_SCHEMA_VERSION = 3;

/** @typedef {'dynamic'|'static'|'markup'|'data'|'framework-output'} LanguageKind */

/** Curated language profiles (origins and outputs). */
export const LANGUAGE_PROFILES = {
  php: {
    kind: "dynamic",
    role: "origin",
    family: "php-ecosystem",
    typing: "gradual",
    typicalFrameworks: ["Laravel", "Symfony", "WordPress"],
    routeStyle: "front-controller / MVC",
    notes: "Only origin with full @chrysalis/ingest + legacy-oracle-php gold path.",
  },
  javascript: {
    kind: "dynamic",
    role: "origin",
    family: "js-ecosystem",
    typing: "dynamic",
    typicalFrameworks: ["Express", "Fastify", "Koa"],
    routeStyle: "middleware chains",
    notes: "AST lift; literal returns can reach hub gold verify + trace replay.",
  },
  "origin:typescript": {
    kind: "dynamic",
    role: "origin",
    family: "js-ecosystem",
    typing: "structural",
    typicalFrameworks: ["Express", "NestJS", "Fastify"],
    routeStyle: "decorators / middleware",
    notes: "Same ingest lane as JavaScript (acorn after strip).",
  },
  python: {
    kind: "dynamic",
    role: "origin",
    family: "python-ecosystem",
    typing: "gradual",
    typicalFrameworks: ["Flask", "FastAPI", "Django"],
    routeStyle: "decorators",
    notes: "CPython ast lift; simple dict literals lowered (G30).",
  },
  java: {
    kind: "static",
    role: "origin",
    family: "jvm",
    typing: "static",
    typicalFrameworks: ["Spring", "JAX-RS"],
    routeStyle: "annotations",
    notes: "Pattern/annotation route lift, not javac front-end.",
  },
  kotlin: {
    kind: "static",
    role: "origin",
    family: "jvm",
    typing: "static",
    typicalFrameworks: ["Ktor", "Spring"],
    routeStyle: "annotations / DSL",
    notes: "Pattern lift (Java-style patterns).",
  },
  go: {
    kind: "static",
    role: "origin",
    family: "go-ecosystem",
    typing: "static",
    typicalFrameworks: ["gin", "echo", "net/http"],
    routeStyle: "registration calls",
    notes: "go-ast-ingest pattern lift.",
  },
  ruby: {
    kind: "dynamic",
    role: "origin",
    family: "ruby-ecosystem",
    typing: "dynamic",
    typicalFrameworks: ["Rails", "Sinatra"],
    routeStyle: "DSL",
    notes: "Pattern route lift.",
  },
  csharp: {
    kind: "static",
    role: "origin",
    family: "dotnet",
    typing: "static",
    typicalFrameworks: ["ASP.NET Core"],
    routeStyle: "attributes",
    notes: "Pattern route lift.",
  },
  rust: {
    kind: "static",
    role: "origin",
    family: "rust-ecosystem",
    typing: "static",
    typicalFrameworks: ["actix-web", "axum"],
    routeStyle: "macros / attributes",
    notes: "Pattern route lift.",
  },
  scala: {
    kind: "static",
    role: "origin",
    family: "jvm",
    typing: "static",
    typicalFrameworks: ["Play", "Akka HTTP"],
    routeStyle: "DSL / directives",
    notes: "Pattern route lift.",
  },
  swift: {
    kind: "static",
    role: "origin",
    family: "apple",
    typing: "static",
    typicalFrameworks: ["Vapor"],
    routeStyle: "result builders",
    notes: "Pattern route lift.",
  },
  vue: {
    kind: "markup",
    role: "origin",
    family: "frontend",
    typing: "component",
    typicalFrameworks: ["Vue SPA"],
    routeStyle: "client routes (limited server lift)",
    notes: "Pattern lift for server-side registrations when present.",
  },
  sql: {
    kind: "data",
    role: "origin",
    family: "data",
    typing: "schema",
    typicalFrameworks: [],
    routeStyle: "n/a",
    notes: "File lift: one GET route per asset file.",
  },
  html: {
    kind: "markup",
    role: "origin",
    family: "markup",
    typing: "document",
    typicalFrameworks: [],
    routeStyle: "static asset",
    notes: "File lift only.",
  },
  css: {
    kind: "markup",
    role: "origin",
    family: "markup",
    typing: "stylesheet",
    typicalFrameworks: [],
    routeStyle: "static asset",
    notes: "File lift only.",
  },
  scss: {
    kind: "markup",
    role: "origin",
    family: "markup",
    typing: "stylesheet",
    typicalFrameworks: [],
    routeStyle: "static asset",
    notes: "File lift only.",
  },
  json: {
    kind: "data",
    role: "origin",
    family: "data",
    typing: "schema",
    typicalFrameworks: [],
    routeStyle: "config",
    notes: "File lift only.",
  },
  yaml: {
    kind: "data",
    role: "origin",
    family: "data",
    typing: "config",
    typicalFrameworks: [],
    routeStyle: "config",
    notes: "File lift only.",
  },
  markdown: {
    kind: "markup",
    role: "origin",
    family: "markup",
    typing: "document",
    typicalFrameworks: [],
    routeStyle: "static",
    notes: "File lift only.",
  },
  "origin:cwl": {
    kind: "dynamic",
    role: "origin",
    family: "chrysalis-cwl",
    typing: "structural",
    typicalFrameworks: ["CWL"],
    routeStyle: "@route + handler blocks",
    notes: "Direct WebIR ingest; gold to TS stacks; canonical consolidation language (G32).",
  },
  "output:cwl": {
    kind: "framework-output",
    role: "output",
    family: "chrysalis-cwl",
    typing: "structural",
    typicalFrameworks: ["CWL"],
    routeStyle: "WebIR projection",
    notes: "emit-cwl-from-hub.mjs round-trip authoring.",
  },
  c: {
    kind: "static",
    role: "origin",
    family: "systems",
    typing: "static",
    typicalFrameworks: [],
    routeStyle: "n/a",
    notes: "File lift only.",
  },
  cpp: {
    kind: "static",
    role: "origin",
    family: "systems",
    typing: "static",
    typicalFrameworks: [],
    routeStyle: "n/a",
    notes: "File lift only.",
  },
  "output:typescript": {
    kind: "framework-output",
    role: "output",
    family: "chrysalis-ts",
    typing: "structural",
    typicalFrameworks: ["Hono (default emit)"],
    routeStyle: "typed handlers + injected ctx",
    notes: "Emitted from WebIR; same spine as hono/fastify.",
  },
  hono: {
    kind: "framework-output",
    role: "output",
    family: "chrysalis-ts",
    typing: "structural",
    typicalFrameworks: ["Hono"],
    routeStyle: "fetch handlers",
    notes: "Primary modern TS target for hub and PHP gold.",
  },
  fastify: {
    kind: "framework-output",
    role: "output",
    family: "chrysalis-ts",
    typing: "structural",
    typicalFrameworks: ["Fastify"],
    routeStyle: "plugin routes",
    notes: "Alternate TS framework emit.",
  },
  nextjs: {
    kind: "framework-output",
    role: "output",
    family: "chrysalis-ts",
    typing: "structural",
    typicalFrameworks: ["Next.js"],
    routeStyle: "app router / API routes",
    notes: "Often contract-first via WPTP when OpenAPI/HAR present.",
  },
};

/**
 * @param {string} id
 * @param {'origin'|'output'} role
 */
export function profileForLanguage(id, role) {
  const keyed = role === "origin" ? `origin:${id}` : `output:${id}`;
  return LANGUAGE_PROFILES[keyed] ?? LANGUAGE_PROFILES[id] ?? null;
}

/** Global best practices (DESIGN-aligned). */
export const BEST_PRACTICES = [
  {
    id: "bp-webir-spine",
    title: "Single WebIR spine",
    appliesTo: "all-pairs",
    text: "Every origin×output pair flows through WebIR. Do not add per-language IR forks in the hub.",
  },
  {
    id: "bp-holes-not-guesses",
    title: "Holes, not best-effort",
    appliesTo: "all-pairs",
    text: "Unsupported constructs become typed holes in reports. Never silently stub behavior.",
  },
  {
    id: "bp-oracle-is-spec",
    title: "Oracle = spec + replay",
    appliesTo: "verify",
    text: "Correctness means trace-backed replay or structural gold gates — not cloning @chrysalis/ingest per language.",
  },
  {
    id: "bp-php-capture-staging",
    title: "PHP capture on staging",
    appliesTo: "origin:php",
    text: "Run oracle-php on origin staging with auto_prepend before promoting PHP→TS routes to production cutover.",
  },
  {
    id: "bp-contract-first",
    title: "Contract-first when available",
    appliesTo: "output:framework",
    text: "If OpenAPI/Swagger/HAR exists in the site tree, prefer wptp-compose over guessing routes from source.",
  },
  {
    id: "bp-literal-gold-staging",
    title: "Literal gold as staging bar",
    appliesTo: "grade:gold-non-php",
    text: "Promote JS/TS/Python literal→Hono pairs via hub-gold-verify + hub-gold-trace-replay before claiming full semantic parity.",
  },
  {
    id: "bp-native-emit-silver",
    title: "Native emit silver honesty",
    appliesTo: "emit:native",
    text: "hub-native-* emitters produce runnable skeletons; verify lane stays none until trace recorders land for that origin.",
  },
  {
    id: "bp-scaffold-open",
    title: "Scaffold open grade",
    appliesTo: "grade:open",
    text: "Open pairs emit hub:emit-scaffold-fallback — runnable but explicitly incomplete; track in work queue.",
  },
  {
    id: "bp-injected-ctx",
    title: "Injected ctx in generated code",
    appliesTo: "output:typescript-family",
    text: "Generated handlers use ctx.time / ctx.random — never Date.now(), Math.random(), or process.env in handlers.",
  },
  {
    id: "bp-trace-upload",
    title: "Upload traces per site",
    appliesTo: "origin:non-php",
    text: "Use hub trace upload + oracle-python/oracle-node recorders on legacy hosts; replay with @chrysalis/verify when promoting.",
  },
  {
    id: "bp-cwl-authoring",
    title: "Prefer CWL for canonical routes",
    appliesTo: "origin:cwl",
    text: "Author new routes in CWL when defining cross-language semantics; legacy languages lift into WebIR first.",
  },
];

const LANE_COMPARISONS = {
  ingest: {
    sharedBy: "Origins using the same ingest lane share parsers, lift scripts, and hole policy.",
    differs: {
      "chrysalis-ingest": "Full PHP semantic ingest; only lane with @chrysalis/ingest.",
      "hub-ast-lift": "AST or runtime parser subprocess; best for JS/TS/Python/Java/Go route shapes.",
      "hub-pattern-lift": "Regex/framework patterns; route shell without deep body semantics.",
      "hub-file-lift": "One GET route per file; for assets and non-app sources.",
      "hub-cwl-direct": "Parse .cwl modules directly to WebIR; no lossy lift (G32).",
    },
  },
  emit: {
    sharedBy: "Outputs using the same emit lane share WebIR lowering targets and scaffold policy.",
    differs: {
      "chrysalis-emit": "PHP-only gold emit via CLI.",
      "hub-webir-typescript": "Hono/Fastify/Next from shared TS emit package.",
      "hub-native-python": "Flask skeleton from emit-python-from-hub.mjs.",
      "hub-native-java": "Spring-style Java from emit-java-from-hub.mjs.",
      "hub-native-go": "gin-style Go from emit-go-from-hub.mjs.",
      "hub-native-ruby": "Sinatra from emit-ruby-from-hub.mjs.",
      "hub-native-csharp": "ASP.NET from emit-csharp-from-hub.mjs.",
      "hub-native-rust": "actix-style from emit-rust-from-hub.mjs.",
      "hub-native-kotlin": "Ktor from emit-kotlin-from-hub.mjs.",
      "hub-native-scala": "Akka HTTP from emit-scala-from-hub.mjs.",
      "hub-native-swift": "Vapor from emit-swift-from-hub.mjs.",
      "hub-scaffold": "emit-target-project fallback with explicit hole.",
      "wptp-compose": "Contract IR compose; skips native ingest when OpenAPI/HAR present.",
      "hub-cwl-emit": "Project WebIR to .cwl source (emit-cwl-from-hub.mjs).",
    },
  },
  verify: {
    sharedBy: "Verify lane defines what CI and operators must run before calling a pair production-ready.",
    differs: {
      "legacy-oracle-php": "Capture + chrysalis verify on PHP corpora.",
      "hub-structural-gold": "Zero-hole WebIR footprint + emit smoke (hub-gold-verify).",
      "hub-trace-replay": "In-process @chrysalis/verify replay against emitted Hono.",
      "wptp-contract": "WPTP harness when contracts exist.",
      none: "Runnable silver/open; no trace parity claimed.",
    },
  },
};

/**
 * @param {string} appliesTo
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 */
function bestPracticeMatches(appliesTo, path) {
  if (appliesTo === "all-pairs") return true;
  if (appliesTo === "verify" && !path.verify.lanes.includes("none")) return true;
  if (appliesTo.startsWith("origin:") && appliesTo.slice(7) === path.origin) return true;
  if (appliesTo.startsWith("output:") && appliesTo.slice(7) === path.output) return true;
  if (appliesTo === "output:framework" && ["hono", "fastify", "nextjs", "typescript"].includes(path.output))
    return true;
  if (appliesTo === "output:typescript-family" && ["hono", "fastify", "nextjs", "typescript"].includes(path.output))
    return true;
  if (appliesTo.startsWith("grade:") && appliesTo.slice(6) === path.grade) return true;
  if (appliesTo === "grade:gold-non-php" && path.grade === "gold" && path.origin !== "php") return true;
  if (appliesTo === "emit:native" && path.emit.lane.startsWith("hub-native-")) return true;
  if (appliesTo.startsWith("grade:") && appliesTo.slice(6) === path.grade) return true;
  return false;
}

/**
 * @param {import('./hub-translation-paths.mjs').describeTranslationPath extends (...args: any) => infer R ? R : never} path
 * @param {Map<string, number>} ingestPeerCounts
 * @param {Map<string, number>} emitPeerCounts
 */
function buildPairKnowledge(path, ingestPeerCounts, emitPeerCounts) {
  const originProfile = profileForLanguage(path.origin, "origin") ?? { kind: "unknown", notes: "" };
  const outputProfile = profileForLanguage(path.output, "output") ?? { kind: "unknown", notes: "" };

  const similarities = [
    {
      id: "sim-webir",
      kind: "shared-ir",
      summary: "Canonical WebIR module between ingest and emit",
      detail: "Same IR schema and hole policy as Chrysalis core ingest/emit.",
    },
    {
      id: "sim-ingest-lane",
      kind: "shared-ingest-lane",
      lane: path.ingest.lane,
      peerPairCount: ingestPeerCounts.get(path.ingest.lane) ?? 0,
      summary: `${ingestPeerCounts.get(path.ingest.lane) ?? 0} pairs share ingest lane ${path.ingest.lane}`,
    },
    {
      id: "sim-emit-lane",
      kind: "shared-emit-lane",
      lane: path.emit.lane,
      peerPairCount: emitPeerCounts.get(path.emit.lane) ?? 0,
      summary: `${emitPeerCounts.get(path.emit.lane) ?? 0} pairs share emit lane ${path.emit.lane}`,
    },
  ];

  if (path.grade === "gold") {
    similarities.push({
      id: "sim-gold-cluster",
      kind: "shared-grade",
      grade: "gold",
      summary: "CI-backed correctness lane (oracle or hub gold suites)",
    });
  }

  if (
    originProfile.family &&
    outputProfile.family &&
    originProfile.family === outputProfile.family
  ) {
    similarities.push({
      id: "sim-language-family",
      kind: "same-family",
      family: originProfile.family,
      summary: `Origin and output share ecosystem family: ${originProfile.family}`,
    });
  }

  const differences = [
    {
      id: "diff-origin-output-role",
      kind: "role",
      summary: `${path.origin} (${originProfile.kind ?? "?"}) → ${path.output} (${outputProfile.kind ?? "?"})`,
      originNotes: originProfile.notes ?? "",
      outputNotes: outputProfile.notes ?? "",
    },
    {
      id: "diff-ingest-vs-emit",
      kind: "lane-mismatch",
      summary: `Ingest: ${path.ingest.lane}; emit: ${path.emit.lane}`,
      ingestDetail: LANE_COMPARISONS.ingest.differs[path.ingest.lane] ?? path.ingest.lane,
      emitDetail: LANE_COMPARISONS.emit.differs[path.emit.lane] ?? path.emit.lane,
    },
    {
      id: "diff-verify",
      kind: "verify-expectation",
      summary: `Verify: ${path.verify.lanes.join(", ")}`,
      detail:
        path.verify.lanes.includes("none")
          ? "No trace parity claimed — promote with recorders + replay before production."
          : "CI scripts: " + (path.verify.ciScripts?.join(", ") || "see path matrix"),
    },
  ];

  if (path.origin !== "php" && path.emit.lane === "chrysalis-emit") {
    differences.push({
      id: "diff-no-php-ingest",
      kind: "capability-gap",
      summary: "Non-PHP origin cannot use chrysalis-ingest emit lane",
    });
  }

  const practiceIds = BEST_PRACTICES.filter((bp) => bestPracticeMatches(bp.appliesTo, path)).map((bp) => bp.id);
  const traits = buildPairTraits(path, originProfile, outputProfile);

  return {
    origin: path.origin,
    output: path.output,
    grade: path.grade,
    runnable: path.runnable,
    pathRef: {
      ingestLane: path.ingest.lane,
      emitLane: path.emit.lane,
      verifyLanes: path.verify.lanes,
      action: path.action,
    },
    similarities,
    differences,
    bestPracticeIds: practiceIds,
    promoteToGold: path.promoteToGold,
    riskLevel: traits.riskLevel,
    idiomLoss: traits.idiomLoss,
    verifyExpectation: traits.verifyExpectation,
    canonicalWebIrPattern: traits.canonicalWebIrPattern,
    pros: traits.pros,
    cons: traits.cons,
  };
}

/**
 * Language-to-language affinity (same ingest lane, migration demand).
 * @param {string} a
 * @param {string} b
 */
export function originSimilarityScore(a, b) {
  if (a === b) return 1;
  const pa = profileForLanguage(a, "origin");
  const pb = profileForLanguage(b, "origin");
  let score = 0;
  if (ingestLaneForOrigin(a) === ingestLaneForOrigin(b)) score += 0.5;
  if (pa?.family && pa.family === pb?.family) score += 0.3;
  if (pa?.kind && pa.kind === pb?.kind) score += 0.2;
  return Math.min(1, score);
}

/**
 * @param {{ origin?: string, output?: string, includeMatrix?: boolean }} [opts]
 */
export function buildHubPathKnowledgeBase(opts = {}) {
  const matrix = buildHubTranslationPathMatrix({
    origin: opts.origin,
    output: opts.output,
  });

  const ingestPeerCounts = new Map();
  const emitPeerCounts = new Map();
  for (const p of matrix.pairs) {
    ingestPeerCounts.set(p.ingest.lane, (ingestPeerCounts.get(p.ingest.lane) ?? 0) + 1);
    emitPeerCounts.set(p.emit.lane, (emitPeerCounts.get(p.emit.lane) ?? 0) + 1);
  }

  const pairs = matrix.pairs.map((p) => buildPairKnowledge(p, ingestPeerCounts, emitPeerCounts));

  const languages = {};
  for (const id of [...new Set([...HUB_WEB_ORIGIN_LANGUAGE_IDS, ...HUB_WEB_OUTPUT_LANGUAGE_IDS])]) {
    languages[id] = {
      id,
      label: LANGUAGE_LABELS[id] ?? id,
      popularityRank: popularityRank(id),
      profile:
        profileForLanguage(id, "origin") ??
        profileForLanguage(id, "output") ??
        null,
      ingestLane: HUB_WEB_ORIGIN_LANGUAGE_IDS.includes(id) ? ingestLaneForOrigin(id) : null,
      isOrigin: HUB_WEB_ORIGIN_LANGUAGE_IDS.includes(id),
      isOutput: HUB_WEB_OUTPUT_LANGUAGE_IDS.includes(id),
    };
  }

  const originClusters = Object.fromEntries(
    HUB_INGEST_LANES.filter((l) => l !== "none").map((lane) => [
      lane,
      HUB_WEB_ORIGIN_LANGUAGE_IDS.filter((id) => ingestLaneForOrigin(id) === lane),
    ]),
  );

  const webDatabaseCatalog = buildWebDatabaseCatalogReport();

  return {
    kind: HUB_PATH_KNOWLEDGE_KIND,
    schemaVersion: HUB_PATH_KNOWLEDGE_SCHEMA_VERSION,
    mission:
      "Comprehensive map of all web language translation paths: 23 origins × 26 outputs (575 directed pairs), with similarities, differences, best practices, and web database catalog.",
    webDatabaseCatalog: {
      kind: webDatabaseCatalog.kind,
      schemaVersion: webDatabaseCatalog.schemaVersion,
      count: webDatabaseCatalog.count,
      tier1Count: webDatabaseCatalog.tier1Count,
      databaseIds: webDatabaseCatalog.databases.map((d) => d.id),
    },
    languages,
    laneComparisons: LANE_COMPARISONS,
    bestPractices: BEST_PRACTICES,
    originClusters,
    laneCatalog: matrix.laneCatalog,
    pairCount: pairs.length,
    pairs,
    summary: matrix.summary,
    matrix: opts.includeMatrix ? matrix : undefined,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} origin
 * @param {string} output
 */
export function queryPathKnowledge(origin, output) {
  const path = describeTranslationPath(origin, output);
  const matrix = buildHubTranslationPathMatrix();
  const ingestPeerCounts = new Map();
  const emitPeerCounts = new Map();
  for (const p of matrix.pairs) {
    ingestPeerCounts.set(p.ingest.lane, (ingestPeerCounts.get(p.ingest.lane) ?? 0) + 1);
    emitPeerCounts.set(p.emit.lane, (emitPeerCounts.get(p.emit.lane) ?? 0) + 1);
  }
  const pair = buildPairKnowledge(path, ingestPeerCounts, emitPeerCounts);
  const practices = BEST_PRACTICES.filter((bp) => pair.bestPracticeIds.includes(bp.id));
  return { path, pair, bestPractices: practices };
}
