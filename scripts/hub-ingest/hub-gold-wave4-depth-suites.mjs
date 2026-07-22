/**
 * Wave 4 matrix depth — cross-native + middleware→cwl + PHP web structured/middleware.
 * Registers existing structured/middleware fixtures against native emit targets.
 */
import { join } from "node:path";

/** @type {readonly string[]} */
const NATIVE_OUTPUTS = ["php", "java", "go", "csharp", "python", "ruby"];

/** @type {readonly string[]} */
const WEB_OUTPUTS = ["hono", "fastify", "cwl"];

/**
 * @typedef {{
 *   origin: string,
 *   idPrefix: string,
 *   structuredFixture: string,
 *   middlewareFixture: string,
 *   middlewareNative: boolean,
 *   includeWeb?: boolean,
 * }} Wave4Origin
 */

/** @type {readonly Wave4Origin[]} */
const WAVE4_ORIGINS = [
  {
    origin: "javascript",
    idPrefix: "js",
    structuredFixture: "fixtures/hub-gold-js-structured",
    middlewareFixture: "fixtures/hub-gold-js-middleware",
    middlewareNative: false,
  },
  {
    origin: "typescript",
    idPrefix: "ts",
    structuredFixture: "fixtures/hub-gold-ts-structured",
    middlewareFixture: "fixtures/hub-gold-ts-middleware",
    middlewareNative: false,
  },
  {
    origin: "python",
    idPrefix: "python",
    structuredFixture: "fixtures/hub-gold-python-structured",
    middlewareFixture: "fixtures/hub-gold-python-middleware",
    middlewareNative: true,
  },
  {
    origin: "java",
    idPrefix: "java",
    structuredFixture: "fixtures/hub-gold-java-structured",
    middlewareFixture: "fixtures/hub-gold-java-middleware",
    middlewareNative: true,
  },
  {
    origin: "go",
    idPrefix: "go",
    structuredFixture: "fixtures/hub-gold-go-structured",
    middlewareFixture: "fixtures/hub-gold-go-middleware",
    middlewareNative: true,
  },
  {
    origin: "csharp",
    idPrefix: "csharp",
    structuredFixture: "fixtures/hub-gold-csharp-structured",
    middlewareFixture: "fixtures/hub-gold-csharp-middleware",
    middlewareNative: true,
  },
  {
    origin: "ruby",
    idPrefix: "ruby",
    structuredFixture: "fixtures/hub-gold-ruby-structured",
    middlewareFixture: "fixtures/hub-gold-ruby-middleware",
    middlewareNative: true,
  },
  {
    origin: "kotlin",
    idPrefix: "kotlin",
    structuredFixture: "fixtures/hub-gold-kotlin-structured",
    middlewareFixture: "fixtures/hub-gold-kotlin-middleware",
    middlewareNative: true,
  },
  {
    origin: "rust",
    idPrefix: "rust",
    structuredFixture: "fixtures/hub-gold-rust-structured",
    middlewareFixture: "fixtures/hub-gold-rust-middleware",
    middlewareNative: true,
  },
  {
    origin: "scala",
    idPrefix: "scala",
    structuredFixture: "fixtures/hub-gold-scala-structured",
    middlewareFixture: "fixtures/hub-gold-scala-middleware",
    middlewareNative: true,
  },
  {
    origin: "swift",
    idPrefix: "swift",
    structuredFixture: "fixtures/hub-gold-swift-structured",
    middlewareFixture: "fixtures/hub-gold-swift-middleware",
    middlewareNative: true,
  },
  {
    origin: "php",
    idPrefix: "php",
    structuredFixture: "fixtures/hub-gold-php-structured",
    middlewareFixture: "fixtures/hub-gold-php-middleware",
    middlewareNative: true,
    includeWeb: true,
  },
];

/**
 * Suites already present in the static manifest (avoid duplicate ids).
 * @type {ReadonlySet<string>}
 */
const EXISTING_IDS = new Set([
  "js-structured-hono",
  "js-structured-fastify",
  "js-structured-cwl",
  "js-middleware-hono",
  "js-middleware-fastify",
  "js-middleware-cwl",
  "js-middleware-nextjs",
  "ts-structured-hono",
  "ts-structured-fastify",
  "ts-structured-cwl",
  "ts-middleware-hono",
  "ts-middleware-fastify",
  "python-structured-hono",
  "python-structured-fastify",
  "python-structured-cwl",
  "python-middleware-hono",
  "python-middleware-fastify",
  "python-middleware-cwl",
  "python-middleware-nextjs",
  "java-structured-hono",
  "java-structured-fastify",
  "java-structured-cwl",
  "java-middleware-hono",
  "java-middleware-fastify",
  "go-structured-hono",
  "go-structured-fastify",
  "go-structured-cwl",
  "go-middleware-hono",
  "go-middleware-fastify",
  "csharp-structured-hono",
  "csharp-structured-fastify",
  "csharp-structured-cwl",
  "csharp-middleware-hono",
  "csharp-middleware-fastify",
  "ruby-structured-hono",
  "ruby-structured-fastify",
  "ruby-structured-cwl",
  "ruby-middleware-hono",
  "ruby-middleware-fastify",
  "kotlin-structured-hono",
  "kotlin-structured-fastify",
  "kotlin-structured-cwl",
  "kotlin-middleware-hono",
  "kotlin-middleware-fastify",
  "rust-structured-hono",
  "rust-structured-fastify",
  "rust-structured-cwl",
  "rust-middleware-hono",
  "rust-middleware-fastify",
  "scala-structured-hono",
  "scala-structured-fastify",
  "scala-structured-cwl",
  "scala-middleware-hono",
  "scala-middleware-fastify",
  "swift-structured-hono",
  "swift-structured-fastify",
  "swift-structured-cwl",
  "swift-middleware-hono",
  "swift-middleware-fastify",
]);

/**
 * @param {string} scriptRoot
 */
export function hubWave4DepthSuites(scriptRoot) {
  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean, roundTrip?: boolean }>} */
  const suites = [];
  /** @type {Set<string>} */
  const seen = new Set(EXISTING_IDS);

  /**
   * @param {string} id
   * @param {string} fixtureRel
   * @param {string} origin
   * @param {string} emitTarget
   * @param {{ roundTrip?: boolean }} [extra]
   */
  function push(id, fixtureRel, origin, emitTarget, extra = {}) {
    if (seen.has(id)) return;
    if (origin === emitTarget) return;
    seen.add(id);
    /** @type {{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean, roundTrip?: boolean }} */
    const row = {
      id,
      fixture: join(scriptRoot, fixtureRel),
      origin,
      emitTarget,
      structural: true,
      traceReplay: true,
    };
    if (extra.roundTrip) row.roundTrip = true;
    suites.push(row);
  }

  for (const o of WAVE4_ORIGINS) {
    // structured → native
    for (const out of NATIVE_OUTPUTS) {
      push(`${o.idPrefix}-structured-${out}-native`, o.structuredFixture, o.origin, out);
    }
    // middleware → native (skip js/ts — body-key emit holes on native)
    if (o.middlewareNative) {
      for (const out of NATIVE_OUTPUTS) {
        push(`${o.idPrefix}-middleware-${out}-native`, o.middlewareFixture, o.origin, out);
      }
    }
    // middleware → cwl (fill gaps)
    push(`${o.idPrefix}-middleware-cwl`, o.middlewareFixture, o.origin, "cwl", {
      roundTrip: true,
    });

    // PHP also needs web structured/middleware rows
    if (o.includeWeb) {
      for (const out of WEB_OUTPUTS) {
        push(`${o.idPrefix}-structured-${out}`, o.structuredFixture, o.origin, out, {
          roundTrip: out === "cwl",
        });
        push(`${o.idPrefix}-middleware-${out}`, o.middlewareFixture, o.origin, out, {
          roundTrip: out === "cwl",
        });
      }
    }
  }

  return suites;
}
