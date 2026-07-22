/**
 * Thin-close wave — ensure every directed hub pair has ≥2 trace-replay suites.
 * Adds depth suites using structured fixtures when available, else literal/pattern.
 */
import { join } from "node:path";
import {
  HUB_WEB_ORIGIN_LANGUAGE_IDS,
  HUB_WEB_OUTPUT_LANGUAGE_IDS,
} from "./language-catalog.mjs";

/** @type {Readonly<Record<string, string>>} */
const STRUCTURED_FIXTURE = {
  javascript: "fixtures/hub-gold-js-structured",
  typescript: "fixtures/hub-gold-ts-structured",
  python: "fixtures/hub-gold-python-structured",
  java: "fixtures/hub-gold-java-structured",
  go: "fixtures/hub-gold-go-structured",
  csharp: "fixtures/hub-gold-csharp-structured",
  ruby: "fixtures/hub-gold-ruby-structured",
  kotlin: "fixtures/hub-gold-kotlin-structured",
  rust: "fixtures/hub-gold-rust-structured",
  scala: "fixtures/hub-gold-scala-structured",
  swift: "fixtures/hub-gold-swift-structured",
  php: "fixtures/hub-gold-php-structured",
};

/** @type {Readonly<Record<string, string>>} */
const LITERAL_FIXTURE = {
  javascript: "fixtures/hub-gold-js-literal",
  typescript: "fixtures/hub-gold-ts-literal",
  python: "fixtures/hub-gold-python-literal",
  java: "fixtures/hub-gold-java-literal",
  go: "fixtures/hub-gold-go-literal",
  csharp: "fixtures/hub-gold-csharp-literal",
  ruby: "fixtures/hub-gold-ruby-literal",
  kotlin: "fixtures/hub-gold-kotlin-literal",
  rust: "fixtures/hub-gold-rust-literal",
  scala: "fixtures/hub-gold-scala-literal",
  swift: "fixtures/hub-gold-swift-literal",
  php: "fixtures/hub-flagship-plain-php",
  cwl: "fixtures/hub-gold-cwl",
  svelte: "fixtures/hub-gold-svelte-kit",
  vue: "fixtures/hub-gold-vue-literal",
  sql: "fixtures/hub-pattern-lift/sql",
  html: "fixtures/hub-pattern-lift/html",
  css: "fixtures/hub-pattern-lift/css",
  scss: "fixtures/hub-pattern-lift/scss",
  json: "fixtures/hub-pattern-lift/json",
  yaml: "fixtures/hub-pattern-lift/yaml",
  markdown: "fixtures/hub-pattern-lift/markdown",
  c: "fixtures/hub-pattern-lift/c",
  cpp: "fixtures/hub-pattern-lift/cpp",
  cobol: "fixtures/hub-pattern-lift/cobol",
};

/** Mirror of hubGoldEmitTargetForOutput — keep local to avoid circular import. */
function emitTargetForOutput(outputLang) {
  if (outputLang === "hono" || outputLang === "fastify" || outputLang === "nextjs" || outputLang === "cwl") {
    return outputLang;
  }
  if (outputLang === "typescript" || outputLang === "javascript") return "hono";
  const native = new Set([
    "python",
    "java",
    "go",
    "ruby",
    "csharp",
    "php",
    "rust",
    "kotlin",
    "scala",
    "swift",
  ]);
  if (native.has(outputLang)) return outputLang;
  const asset = new Set(["c", "cpp", "sql", "html", "css", "scss", "json", "yaml", "markdown", "vue"]);
  if (asset.has(outputLang)) return outputLang;
  return null;
}

/**
 * @param {string} scriptRoot
 * @param {Array<{ id: string, origin: string, emitTarget: string, traceReplay?: boolean }>} priorSuites
 */
export function hubThinCloseSuites(scriptRoot, priorSuites) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  /** @type {Set<string>} */
  const seenIds = new Set();

  for (const s of priorSuites) {
    seenIds.add(s.id);
    if (s.traceReplay === false) continue;
    const key = `${s.origin}::${s.emitTarget}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  /** @type {Set<string>} */
  const needed = new Set();
  for (const origin of HUB_WEB_ORIGIN_LANGUAGE_IDS) {
    for (const output of HUB_WEB_OUTPUT_LANGUAGE_IDS) {
      if (origin === output) continue;
      const et = emitTargetForOutput(output);
      if (!et) continue;
      if (origin === et) continue;
      needed.add(`${origin}::${et}`);
    }
  }

  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean }>} */
  const suites = [];

  for (const key of [...needed].sort()) {
    const [origin, emitTarget] = key.split("::");
    let n = counts.get(key) ?? 0;
    let slot = 0;
    while (n < 2) {
      slot += 1;
      const structured = STRUCTURED_FIXTURE[origin];
      const literal = LITERAL_FIXTURE[origin];
      const fixtureRel =
        slot === 1 && structured ? structured : literal ?? structured;
      if (!fixtureRel) break;

      const kind = fixtureRel.includes("-structured") || fixtureRel.includes("php-structured")
        ? "structured"
        : "thin-close";
      let id =
        kind === "structured"
          ? `${origin}-structured-${emitTarget}-thin`
          : `${origin}-thin-close-${emitTarget}${slot > 1 ? `-${slot}` : ""}`;

      if (kind === "structured") {
        const alt = `${origin}-structured-${emitTarget}`;
        if (!seenIds.has(alt)) id = alt;
        const altNative = `${origin}-structured-${emitTarget}-native`;
        if (seenIds.has(id) && !seenIds.has(altNative)) id = altNative;
      }

      if (seenIds.has(id)) {
        id = `${origin}-thin-close-${emitTarget}-${slot}`;
      }
      if (seenIds.has(id)) {
        id = `${origin}-thin-close-${emitTarget}-${slot}-${suites.length}`;
      }

      seenIds.add(id);
      suites.push({
        id,
        fixture: join(scriptRoot, fixtureRel),
        origin,
        emitTarget,
        structural: true,
        traceReplay: true,
      });
      n += 1;
      counts.set(key, n);
    }
  }

  return suites;
}
