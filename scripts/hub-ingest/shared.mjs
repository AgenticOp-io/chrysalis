import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Convert monorepo root (scripts/hub-ingest → ../..), not process.cwd(). */
const CONVERT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

let cachedHubPython = null;

/** CPython for hub ast / oracle (python3 on Linux CI, python on Windows). */
export function resolveHubPython() {
  if (process.env.CHRYSALIS_HUB_PYTHON) return process.env.CHRYSALIS_HUB_PYTHON;
  if (cachedHubPython) return cachedHubPython;
  for (const cmd of ["python3", "python", "py"]) {
    const r = spawnSync(cmd, ["-c", "import ast"], { encoding: "utf8" });
    if (r.status === 0) {
      cachedHubPython = cmd;
      return cmd;
    }
  }
  cachedHubPython = "python3";
  return cachedHubPython;
}

export const EXT_BY_LANG = {
  php: [".php", ".phtml"],
  javascript: [".js", ".jsx", ".mjs", ".cjs"],
  typescript: [".ts", ".tsx"],
  vue: [".vue"],
  nuxt: [".ts", ".js", ".mjs", ".cjs"],
  python: [".py"],
  java: [".java"],
  kotlin: [".kt"],
  go: [".go"],
  ruby: [".rb", ".ru"],
  csharp: [".cs"],
  cpp: [".cpp"],
  c: [".c", ".h"],
  cobol: [".cob", ".cbl"],
  rust: [".rs"],
  swift: [".swift"],
  scala: [".scala"],
  elixir: [".ex", ".exs"],
  dart: [".dart"],
  sql: [".sql"],
  html: [".html"],
  css: [".css"],
  scss: [".scss"],
  json: [".json"],
  yaml: [".yaml", ".yml"],
  markdown: [".md", ".markdown"],
  cwl: [".cwl"],
};

/** Map hub output language id to emit backend (TypeScript stacks only). */
export function resolveEmitBackend(outputLang) {
  if (outputLang === "hono" || outputLang === "fastify" || outputLang === "nextjs") return outputLang;
  if (outputLang === "typescript") return "hono";
  return null;
}

export function hubWebirPath(projectDir, originLang) {
  return join(projectDir, ".chrysalis", `hub.${originLang}.webir.json`);
}

export function hubBundlePath(projectDir, originLang) {
  return join(projectDir, ".chrysalis", `hub.${originLang}.bundle.json`);
}

/**
 * Load `@chrysalis/webir` without requiring process.cwd() to be convert root.
 * Order: convert root via this file → cwd (legacy hub smokes) → package import.
 * Slice 3 item 3 — see chrysalis-cwl docs/history/WEBIR-EXTRACT-PLAN.md.
 */
export async function loadWebir() {
  const candidates = [
    join(CONVERT_ROOT, "packages/webir/dist/index.js"),
    join(process.cwd(), "packages/webir/dist/index.js"),
  ];
  for (const entry of candidates) {
    if (existsSync(entry)) {
      return import(pathToFileURL(entry).href);
    }
  }
  try {
    return await import("@chrysalis/webir");
  } catch (err) {
    throw new Error(
      `Cannot resolve @chrysalis/webir. Tried:\n  - ${candidates.join("\n  - ")}\n  - import("@chrysalis/webir")\n` +
        `Cause: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function loadEmitter(target) {
  const pkg =
    target === "fastify"
      ? "packages/emit-fastify/dist/index.js"
      : target === "nextjs"
        ? null
        : "packages/emit-hono/dist/index.js";
  if (target === "nextjs") return { kind: "nextjs-script" };
  const href = pathToFileURL(join(process.cwd(), pkg)).href;
  const mod = await import(href);
  return { kind: "emit", emit: mod.emit };
}

export function guessRoutePath(file) {
  const base = file.replace(/\\/g, "/").replace(/\.[^.]+$/, "");
  if (base.includes("routes/")) return "/" + base.split("routes/")[1];
  if (base.includes("api/")) return "/" + base.split("api/")[1];
  return "/" + base.replace(/^\/+/, "").replace(/\/index$/, "") || "/";
}
