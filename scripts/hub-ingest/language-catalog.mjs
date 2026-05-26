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
  swift: "Swift",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  hono: "TypeScript (Hono)",
  fastify: "TypeScript (Fastify)",
  nextjs: "TypeScript (Next.js)",
};

/**
 * Manual origin dropdown + route sources.
 * Includes app stacks plus common non-web source formats so all detected
 * languages can still be translated through open/scaffold routes.
 */
export const HUB_WEB_ORIGIN_LANGUAGE_IDS = [
  "php",
  "javascript",
  "typescript",
  "vue",
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
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
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
];

/** Framework outputs (subset of {@link HUB_WEB_OUTPUT_LANGUAGE_IDS}). */
export const HUB_FRAMEWORK_OUTPUT_IDS = ["hono", "fastify", "nextjs"];

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

export function isFrameworkOutput(id) {
  return HUB_FRAMEWORK_OUTPUT_IDS.includes(id);
}
