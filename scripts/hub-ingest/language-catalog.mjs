/**
 * Universal web language catalog for Translation Hub (single source of truth).
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
  cpp: "C++",
  c: "C",
  rust: "Rust",
  swift: "Swift",
  scala: "Scala",
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

/** All origin languages the hub accepts (includes markup/data). */
export const HUB_ORIGIN_LANGUAGE_IDS = [
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
  "cpp",
  "c",
  "rust",
  "swift",
  "scala",
  "sql",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "markdown",
];

/** Framework outputs in addition to language ids. */
export const HUB_FRAMEWORK_OUTPUT_IDS = ["hono", "fastify", "nextjs"];

export function hubOriginLanguages() {
  return HUB_ORIGIN_LANGUAGE_IDS.map((id) => ({ id, label: LANGUAGE_LABELS[id] ?? id }));
}

export function hubOutputLanguages() {
  const ids = [...new Set([...HUB_ORIGIN_LANGUAGE_IDS, ...HUB_FRAMEWORK_OUTPUT_IDS])];
  return ids.map((id) => ({ id, label: LANGUAGE_LABELS[id] ?? id }));
}

export function isFrameworkOutput(id) {
  return HUB_FRAMEWORK_OUTPUT_IDS.includes(id);
}
