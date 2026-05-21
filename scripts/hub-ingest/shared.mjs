import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const EXT_BY_LANG = {
  php: [".php", ".phtml"],
  javascript: [".js", ".jsx", ".mjs", ".cjs"],
  typescript: [".ts", ".tsx"],
  vue: [".vue"],
  python: [".py"],
  java: [".java"],
  kotlin: [".kt"],
  go: [".go"],
  ruby: [".rb"],
  csharp: [".cs"],
  cpp: [".cpp"],
  c: [".c", ".h"],
  rust: [".rs"],
  swift: [".swift"],
  scala: [".scala"],
  sql: [".sql"],
  html: [".html"],
  css: [".css"],
  scss: [".scss"],
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

export async function loadWebir() {
  const webirPkg = join(process.cwd(), "packages/webir/dist/index.js");
  return import(pathToFileURL(webirPkg).href);
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
