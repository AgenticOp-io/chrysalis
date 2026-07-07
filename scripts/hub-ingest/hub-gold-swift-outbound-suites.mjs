/**
 * Generated hub gold suites — swift outbound wave (23 pairs).
 */
import { join } from "node:path";

/** @type {readonly string[]} */
const SWIFT_WAVE_ORIGINS = [
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
  "sql",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "scss",
  "c",
  "cpp",
  "php",
  "cwl",
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
  sql: "fixtures/hub-pattern-lift/sql",
  html: "fixtures/hub-pattern-lift/html",
  css: "fixtures/hub-pattern-lift/css",
  json: "fixtures/hub-pattern-lift/json",
  yaml: "fixtures/hub-pattern-lift/yaml",
  markdown: "fixtures/hub-pattern-lift/markdown",
  scss: "fixtures/hub-pattern-lift/scss",
  c: "fixtures/hub-pattern-lift/c",
  cpp: "fixtures/hub-pattern-lift/cpp",
  php: "fixtures/hub-flagship-plain-php",
  cwl: "fixtures/hub-gold-cwl",
};

/**
 * @param {string} scriptRoot
 */
export function hubSwiftOutboundSuites(scriptRoot) {
  /** @type {Array<{ id: string, fixture: string, origin: string, emitTarget: string, structural: boolean, traceReplay: boolean }>} */
  const suites = [];
  for (const origin of SWIFT_WAVE_ORIGINS) {
    if (origin === "swift") continue;
    const rel = ORIGIN_FIXTURE[origin];
    if (!rel) continue;
    suites.push({
      id: `${origin}-literal-swift-native`,
      fixture: join(scriptRoot, rel),
      origin,
      emitTarget: "swift",
      structural: true,
      traceReplay: true,
    });
  }
  return suites;
}
