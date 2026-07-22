/**
 * Full-gold wave — every directed pair gets structured + middleware suites.
 * North star from MATRIX-DEPTH-PROGRAM: literal + structured + middleware.
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
  cwl: "fixtures/hub-gold-cwl-structured",
  vue: "fixtures/hub-gold-vue-structured",
  svelte: "fixtures/hub-gold-svelte-structured",
  sql: "fixtures/hub-gold-sql-structured",
  html: "fixtures/hub-gold-html-structured",
  css: "fixtures/hub-gold-css-structured",
  scss: "fixtures/hub-gold-scss-structured",
  json: "fixtures/hub-gold-json-structured",
  yaml: "fixtures/hub-gold-yaml-structured",
  markdown: "fixtures/hub-gold-markdown-structured",
  c: "fixtures/hub-gold-c-structured",
  cpp: "fixtures/hub-gold-cpp-structured",
  cobol: "fixtures/hub-gold-cobol-structured",
};

/** Web emit targets that accept js/ts middleware with body.key. */
const JS_TS_RICH_MW_TARGETS = new Set(["hono", "fastify", "cwl", "nextjs"]);

/** @type {Readonly<Record<string, string>>} */
const MIDDLEWARE_FIXTURE = {
  javascript: "fixtures/hub-gold-js-middleware",
  typescript: "fixtures/hub-gold-ts-middleware",
  python: "fixtures/hub-gold-python-middleware",
  java: "fixtures/hub-gold-java-middleware",
  go: "fixtures/hub-gold-go-middleware",
  csharp: "fixtures/hub-gold-csharp-middleware",
  ruby: "fixtures/hub-gold-ruby-middleware",
  kotlin: "fixtures/hub-gold-kotlin-middleware",
  rust: "fixtures/hub-gold-rust-middleware",
  scala: "fixtures/hub-gold-scala-middleware",
  swift: "fixtures/hub-gold-swift-middleware",
  php: "fixtures/hub-gold-php-middleware",
  cwl: "fixtures/hub-gold-cwl-middleware",
  vue: "fixtures/hub-gold-vue-middleware",
  svelte: "fixtures/hub-gold-svelte-middleware",
  sql: "fixtures/hub-gold-sql-middleware",
  html: "fixtures/hub-gold-html-middleware",
  css: "fixtures/hub-gold-css-middleware",
  scss: "fixtures/hub-gold-scss-middleware",
  json: "fixtures/hub-gold-json-middleware",
  yaml: "fixtures/hub-gold-yaml-middleware",
  markdown: "fixtures/hub-gold-markdown-middleware",
  c: "fixtures/hub-gold-c-middleware",
  cpp: "fixtures/hub-gold-cpp-middleware",
  cobol: "fixtures/hub-gold-cobol-middleware",
};

const JS_TS_PLAIN_MW = {
  javascript: "fixtures/hub-gold-js-middleware-plain",
  typescript: "fixtures/hub-gold-ts-middleware-plain",
};

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
 * @param {string} origin
 * @param {string} emitTarget
 */
function middlewareFixtureFor(origin, emitTarget) {
  if ((origin === "javascript" || origin === "typescript") && !JS_TS_RICH_MW_TARGETS.has(emitTarget)) {
    return JS_TS_PLAIN_MW[origin];
  }
  return MIDDLEWARE_FIXTURE[origin];
}

/**
 * @param {string} scriptRoot
 * @param {Array<{ id: string, origin: string, emitTarget: string, traceReplay?: boolean }>} priorSuites
 */
export function hubFullGoldSuites(scriptRoot, priorSuites) {
  /** @type {Map<string, { structured: boolean, middleware: boolean }>} */
  const flags = new Map();
  /** @type {Set<string>} */
  const seenIds = new Set();

  for (const s of priorSuites) {
    seenIds.add(s.id);
    if (s.traceReplay === false) continue;
    const key = `${s.origin}::${s.emitTarget}`;
    const cur = flags.get(key) ?? { structured: false, middleware: false };
    if (s.id.includes("-structured-")) cur.structured = true;
    if (s.id.includes("-middleware-")) cur.middleware = true;
    flags.set(key, cur);
  }

  /** @type {Set<string>} */
  const needed = new Set();
  for (const origin of HUB_WEB_ORIGIN_LANGUAGE_IDS) {
    for (const output of HUB_WEB_OUTPUT_LANGUAGE_IDS) {
      if (origin === output) continue;
      const et = emitTargetForOutput(output);
      if (!et || origin === et) continue;
      needed.add(`${origin}::${et}`);
    }
  }

  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean, roundTrip?: boolean }>} */
  const suites = [];

  /**
   * @param {string} id
   * @param {string} fixtureRel
   * @param {string} origin
   * @param {string} emitTarget
   */
  function push(id, fixtureRel, origin, emitTarget) {
    if (!fixtureRel || seenIds.has(id)) return false;
    seenIds.add(id);
    /** @type {{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean, roundTrip?: boolean }} */
    const row = {
      id,
      fixture: join(scriptRoot, fixtureRel),
      origin,
      emitTarget,
      structural: true,
      traceReplay: true,
    };
    if (emitTarget === "cwl") row.roundTrip = true;
    suites.push(row);
    return true;
  }

  for (const key of [...needed].sort()) {
    const [origin, emitTarget] = key.split("::");
    const cur = flags.get(key) ?? { structured: false, middleware: false };

    if (!cur.structured) {
      const fx = STRUCTURED_FIXTURE[origin];
      const id = `${origin}-structured-${emitTarget}-full`;
      if (push(id, fx, origin, emitTarget)) cur.structured = true;
    }

    if (!cur.middleware) {
      const fx = middlewareFixtureFor(origin, emitTarget);
      const id = `${origin}-middleware-${emitTarget}-full`;
      if (push(id, fx, origin, emitTarget)) cur.middleware = true;
    }

    flags.set(key, cur);
  }

  return suites;
}
