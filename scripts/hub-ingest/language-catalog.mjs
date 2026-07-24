/**
 * Translation Hub language catalog (single source of truth).
 * Origins: common web stacks (autodetect may still see SQL/JSON via extensions).
 * Outputs: modern web application targets only.
 */

export const LANGUAGE_LABELS = {
  php: "PHP",
  javascript: "JavaScript",
  typescript: "TypeScript",
  vue: "Vue",
  nuxt: "Vue (Nuxt Nitro/h3)",
  svelte: "SvelteKit",
  python: "Python",
  java: "Java",
  kotlin: "Kotlin",
  go: "Go",
  ruby: "Ruby",
  csharp: "C#",
  rust: "Rust",
  scala: "Scala",
  cpp: "C++",
  c: "C",
  cobol: "COBOL",
  swift: "Swift",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  cwl: "Chrysalis Web Language (CWL)",
  hono: "TypeScript (Hono)",
  fastify: "TypeScript (Fastify)",
  nextjs: "TypeScript (Next.js)",
};

/**
 * Manual origin dropdown + route sources.
 * Includes app stacks plus common non-web source formats so all detected
 * languages can still be translated through open/scaffold routes.
 * `cobol` is origin-only (legacy enterprise silver file-lift → WebIR; not a hub emit).
 */
export const HUB_WEB_ORIGIN_LANGUAGE_IDS = [
  "php",
  "javascript",
  "typescript",
  "vue",
  "svelte",
  "python",
  "java",
  "kotlin",
  "go",
  "ruby",
  "csharp",
  "rust",
  "scala",
  "cpp",
  "c",
  "cobol",
  "swift",
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "cwl",
];

/** Output dropdown: complete open matrix including native targets. */
export const HUB_WEB_OUTPUT_LANGUAGE_IDS = [
  "typescript",
  "javascript",
  "php",
  "python",
  "java",
  "kotlin",
  "go",
  "ruby",
  "csharp",
  "rust",
  "scala",
  "cpp",
  "c",
  "swift",
  "sql",
  "vue",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "hono",
  "fastify",
  "nextjs",
  "cwl",
];

/** Framework outputs (subset of {@link HUB_WEB_OUTPUT_LANGUAGE_IDS}). */
export const HUB_FRAMEWORK_OUTPUT_IDS = ["hono", "fastify", "nextjs"];

/**
 * Popularity-weighted ordering for roadmap prioritization.
 * This is a pragmatic product ranking (ecosystem usage + migration demand),
 * not a strict benchmark dataset.
 */
export const LANGUAGE_POPULARITY_ORDER = [
  "javascript",
  "python",
  "java",
  "typescript",
  "php",
  "csharp",
  "go",
  "c",
  "cpp",
  "cobol",
  "rust",
  "kotlin",
  "swift",
  "ruby",
  "scala",
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "vue",
  "svelte",
  "hono",
  "fastify",
  "nextjs",
];

const webOriginSet = new Set(HUB_WEB_ORIGIN_LANGUAGE_IDS);
const webOutputSet = new Set(HUB_WEB_OUTPUT_LANGUAGE_IDS);

export function isHubWebOrigin(id) {
  return webOriginSet.has(id);
}

export function isHubWebOutput(id) {
  return webOutputSet.has(id);
}

export function hubOriginLanguages() {
  return HUB_WEB_ORIGIN_LANGUAGE_IDS.map((id) => ({ id, label: LANGUAGE_LABELS[id] ?? id }));
}

export function hubOutputLanguages() {
  return HUB_WEB_OUTPUT_LANGUAGE_IDS.map((id) => ({ id, label: LANGUAGE_LABELS[id] ?? id }));
}

/** Directed hub pairs: origins × outputs minus identity (origin also listed as output). */
export function hubDirectedPairCount() {
  const outputIds = new Set(HUB_WEB_OUTPUT_LANGUAGE_IDS);
  const identityPairs = HUB_WEB_ORIGIN_LANGUAGE_IDS.filter((id) => outputIds.has(id)).length;
  return HUB_WEB_ORIGIN_LANGUAGE_IDS.length * HUB_WEB_OUTPUT_LANGUAGE_IDS.length - identityPairs;
}

export function isFrameworkOutput(id) {
  return HUB_FRAMEWORK_OUTPUT_IDS.includes(id);
}

export function popularityRank(id) {
  const idx = LANGUAGE_POPULARITY_ORDER.indexOf(id);
  return idx < 0 ? 999 : idx + 1;
}

/**
 * Hub readiness / work-queue focus: high-demand web stacks for migration pairs.
 * Kept in the catalog so API filters and JSON exports stay aligned.
 */
export const HUB_POPULAR_WEB_FOCUS_IDS = [
  "php",
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "ruby",
  "csharp",
  "cwl",
];

/** Asset/config origins: one GET route per file with literal scaffold body (silver file-lift). */
export const HUB_SILVER_FILE_LIFT_ORIGIN_IDS = [
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
  "c",
  "cpp",
];
