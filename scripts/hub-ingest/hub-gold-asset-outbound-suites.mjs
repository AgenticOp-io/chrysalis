/**
 * Generated hub gold suites — asset outbound wave (210 pairs).
 */
import { join } from "node:path";
import { HUB_ASSET_GOLD_EMIT_TARGETS } from "./hub-gold-asset-emit.mjs";

/** @type {readonly string[]} */
const ASSET_WAVE_ORIGINS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "csharp",
  "ruby",
  "svelte",
  "vue",
  "rust",
  "kotlin",
  "scala",
  "swift",
  "sql",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "scss",
  "c",
  "cpp",
];

/** @type {Readonly<Record<string, string>>} */
const ORIGIN_FIXTURE = {
  javascript: "fixtures/hub-gold-js-literal",
  typescript: "fixtures/hub-gold-ts-literal",
  python: "fixtures/hub-gold-python-literal",
  java: "fixtures/hub-gold-java-literal",
  go: "fixtures/hub-gold-go-literal",
  csharp: "fixtures/hub-gold-csharp-literal",
  ruby: "fixtures/hub-gold-ruby-literal",
  svelte: "fixtures/hub-gold-svelte-kit",
  vue: "fixtures/hub-gold-vue-literal",
  rust: "fixtures/hub-gold-rust-literal",
  kotlin: "fixtures/hub-gold-kotlin-literal",
  scala: "fixtures/hub-gold-scala-literal",
  swift: "fixtures/hub-gold-swift-literal",
  sql: "fixtures/hub-pattern-lift/sql",
  html: "fixtures/hub-pattern-lift/html",
  css: "fixtures/hub-pattern-lift/css",
  json: "fixtures/hub-pattern-lift/json",
  yaml: "fixtures/hub-pattern-lift/yaml",
  markdown: "fixtures/hub-pattern-lift/markdown",
  scss: "fixtures/hub-pattern-lift/scss",
  c: "fixtures/hub-pattern-lift/c",
  cpp: "fixtures/hub-pattern-lift/cpp",
};

/**
 * @param {string} scriptRoot
 * @returns {import('./hub-gold-manifest.mjs').HUB_GOLD_SUITES extends (infer S)[] ? S[] : never}
 */
export function hubAssetOutboundSuites(scriptRoot) {
  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean }>} */
  const suites = [];
  for (const output of HUB_ASSET_GOLD_EMIT_TARGETS) {
    for (const origin of ASSET_WAVE_ORIGINS) {
      if (origin === output) continue;
      const rel = ORIGIN_FIXTURE[origin];
      if (!rel) continue;
      suites.push({
        id: `${origin}-asset-${output}`,
        fixture: join(scriptRoot, rel),
        origin,
        emitTarget: output,
        structural: true,
        traceReplay: true,
      });
    }
  }
  return suites;
}
