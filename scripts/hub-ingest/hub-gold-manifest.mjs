/**
 * Hub gold verification suites (structural + optional trace replay).
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {"hono"|"fastify"|"nextjs"|"cwl"|"python"|"java"|"go"|"ruby"|"csharp"|"rust"|"kotlin"|"scala"|"swift"} HubGoldEmitTarget */

/**
 * @typedef {{ id: string, fixture: string, origin: string, emitTarget: HubGoldEmitTarget, structural: boolean, traceReplay: boolean, roundTrip?: boolean, wptpCompose?: boolean }} HubGoldSuite
 */

/** @type {HubGoldSuite[]} */
export const HUB_GOLD_SUITES = [
  {
    id: "js-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-structured-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-structured"),
    origin: "typescript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-structured-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-structured"),
    origin: "typescript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-structured-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-structured"),
    origin: "typescript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "js-structured-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-structured-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-structured-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "js-structured-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-structured"),
    origin: "javascript",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ts-structured-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-structured"),
    origin: "typescript",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-middleware-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-middleware-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "js-middleware-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "js-middleware-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-middleware"),
    origin: "javascript",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-structured-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-structured"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "cwl-gold-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "cwl-gold-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "cwl-gold-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "cwl-gold-roundtrip",
    fixture: join(scriptRoot, "fixtures/hub-gold-cwl"),
    origin: "cwl",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
    roundTrip: true,
  },
  {
    id: "js-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-js-literal"),
    origin: "javascript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "ts-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-ts-literal"),
    origin: "typescript",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "python-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "python-native-python",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "python",
    structural: true,
    traceReplay: false,
  },
  {
    id: "java-native-java",
    fixture: join(scriptRoot, "fixtures/hub-gold-java-literal"),
    origin: "java",
    emitTarget: "java",
    structural: true,
    traceReplay: false,
  },
  {
    id: "go-native-go",
    fixture: join(scriptRoot, "fixtures/hub-gold-go-literal"),
    origin: "go",
    emitTarget: "go",
    structural: true,
    traceReplay: false,
  },
  {
    id: "ruby-native-ruby",
    fixture: join(scriptRoot, "fixtures/hub-gold-ruby-literal"),
    origin: "ruby",
    emitTarget: "ruby",
    structural: true,
    traceReplay: false,
  },
  {
    id: "csharp-native-csharp",
    fixture: join(scriptRoot, "fixtures/hub-gold-csharp-literal"),
    origin: "csharp",
    emitTarget: "csharp",
    structural: true,
    traceReplay: false,
  },
  {
    id: "rust-native-rust",
    fixture: join(scriptRoot, "fixtures/hub-gold-rust-literal"),
    origin: "rust",
    emitTarget: "rust",
    structural: true,
    traceReplay: false,
  },
  {
    id: "kotlin-native-kotlin",
    fixture: join(scriptRoot, "fixtures/hub-gold-kotlin-literal"),
    origin: "kotlin",
    emitTarget: "kotlin",
    structural: true,
    traceReplay: false,
  },
  {
    id: "scala-native-scala",
    fixture: join(scriptRoot, "fixtures/hub-gold-scala-literal"),
    origin: "scala",
    emitTarget: "scala",
    structural: true,
    traceReplay: false,
  },
  {
    id: "swift-native-swift",
    fixture: join(scriptRoot, "fixtures/hub-gold-swift-literal"),
    origin: "swift",
    emitTarget: "swift",
    structural: true,
    traceReplay: false,
  },
  {
    id: "python-middleware-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-middleware"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-middleware-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-middleware"),
    origin: "python",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ruby-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-ruby-literal"),
    origin: "ruby",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ruby-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-ruby-literal"),
    origin: "ruby",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "ruby-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-ruby-literal"),
    origin: "ruby",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "java-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-java-literal"),
    origin: "java",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "java-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-java-literal"),
    origin: "java",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "java-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-java-literal"),
    origin: "java",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "go-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-go-literal"),
    origin: "go",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "go-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-go-literal"),
    origin: "go",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "go-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-go-literal"),
    origin: "go",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "csharp-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-csharp-literal"),
    origin: "csharp",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "csharp-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-csharp-literal"),
    origin: "csharp",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "csharp-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-csharp-literal"),
    origin: "csharp",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-middleware-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-middleware"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "python-middleware-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-middleware"),
    origin: "python",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "java-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-java-literal"),
    origin: "java",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "go-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-go-literal"),
    origin: "go",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "csharp-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-csharp-literal"),
    origin: "csharp",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "ruby-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-ruby-literal"),
    origin: "ruby",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "kotlin-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-kotlin-literal"),
    origin: "kotlin",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "kotlin-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-kotlin-literal"),
    origin: "kotlin",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "kotlin-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-kotlin-literal"),
    origin: "kotlin",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "kotlin-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-kotlin-literal"),
    origin: "kotlin",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "scala-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-scala-literal"),
    origin: "scala",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "scala-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-scala-literal"),
    origin: "scala",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "scala-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-scala-literal"),
    origin: "scala",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "scala-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-scala-literal"),
    origin: "scala",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "swift-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-swift-literal"),
    origin: "swift",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "swift-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-swift-literal"),
    origin: "swift",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "swift-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-swift-literal"),
    origin: "swift",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "swift-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-swift-literal"),
    origin: "swift",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "rust-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-rust-literal"),
    origin: "rust",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "rust-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-rust-literal"),
    origin: "rust",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "rust-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-rust-literal"),
    origin: "rust",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
  },
  {
    id: "rust-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-rust-literal"),
    origin: "rust",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "sql-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/sql"),
    origin: "sql",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "sql-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/sql"),
    origin: "sql",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "sql-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/sql"),
    origin: "sql",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "html-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/html"),
    origin: "html",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "html-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/html"),
    origin: "html",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "html-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/html"),
    origin: "html",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "json-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/json"),
    origin: "json",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "json-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/json"),
    origin: "json",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "json-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-pattern-lift/json"),
    origin: "json",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "vue-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-vue-literal"),
    origin: "vue",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "vue-literal-fastify",
    fixture: join(scriptRoot, "fixtures/hub-gold-vue-literal"),
    origin: "vue",
    emitTarget: "fastify",
    structural: true,
    traceReplay: true,
  },
  {
    id: "vue-literal-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-gold-vue-literal"),
    origin: "vue",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
  },
  {
    id: "contract-first-hono",
    fixture: join(scriptRoot, "fixtures/hub-contract-first"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
    wptpCompose: true,
  },
  {
    id: "contract-first-nextjs",
    fixture: join(scriptRoot, "fixtures/hub-contract-first"),
    origin: "python",
    emitTarget: "nextjs",
    structural: true,
    traceReplay: true,
    wptpCompose: true,
  },
];

/**
 * @param {string} [id]
 * @returns {HubGoldSuite[]}
 */
export function resolveGoldSuites(id) {
  if (!id) return HUB_GOLD_SUITES;
  const found = HUB_GOLD_SUITES.filter((s) => s.id === id);
  if (found.length === 0) throw new Error(`unknown hub gold suite: ${id}`);
  return found;
}

/** @returns {string[]} */
export function hubGoldStructuralSuiteIds() {
  return HUB_GOLD_SUITES.filter((s) => s.structural).map((s) => s.id);
}

/** @returns {string[]} */
export function hubGoldTraceReplaySuiteIds() {
  return HUB_GOLD_SUITES.filter((s) => s.traceReplay).map((s) => s.id);
}

/**
 * Map hub matrix languages to emit target for gold suite lookup.
 * @param {string} outputLang
 * @returns {HubGoldEmitTarget | null}
 */
export function hubGoldEmitTargetForOutput(outputLang) {
  if (outputLang === "hono" || outputLang === "fastify" || outputLang === "nextjs" || outputLang === "cwl")
    return outputLang;
  if (outputLang === "typescript") return "hono";
  const native = new Set([
    "python",
    "java",
    "go",
    "ruby",
    "csharp",
    "rust",
    "kotlin",
    "scala",
    "swift",
  ]);
  if (native.has(outputLang)) return outputLang;
  return null;
}

/**
 * Gold CI suites that structurally cover an origin×output pair (when emit target matches).
 * @param {string} origin
 * @param {string} outputLang
 * @returns {HubGoldSuite[]}
 */
export function hubGoldSuitesForPair(origin, outputLang) {
  const emitTarget = hubGoldEmitTargetForOutput(outputLang);
  if (!emitTarget) return [];
  return HUB_GOLD_SUITES.filter(
    (s) => s.structural && s.origin === origin && s.emitTarget === emitTarget,
  );
}

/**
 * @param {string} origin
 * @param {string} outputLang
 */
export function buildHubGoldSuiteCoverage(origin, outputLang) {
  const suites = hubGoldSuitesForPair(origin, outputLang);
  return {
    origin,
    output: outputLang,
    emitTarget: hubGoldEmitTargetForOutput(outputLang),
    suiteIds: suites.map((s) => s.id),
    traceReplaySuiteIds: suites.filter((s) => s.traceReplay).map((s) => s.id),
    roundTripSuiteIds: suites.filter((s) => s.roundTrip).map((s) => s.id),
    suiteCount: suites.length,
  };
}
