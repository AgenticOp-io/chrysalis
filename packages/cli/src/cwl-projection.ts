import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Module } from "@chrysalis/webir";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const hubRoutesScript = resolve(repoRoot, "scripts/hub-ingest/hub-webir-routes.mjs");

export async function renderCwlFromModule(
  mod: Module,
  opts: { header?: string; moduleName?: string } = {},
): Promise<{ text: string; holeCount: number; routeCount: number }> {
  const { listCwlRoutes, renderCwlRoutes } = await import(pathToFileURL(hubRoutesScript).href);
  const routes = listCwlRoutes(mod);
  const { text, holeCount } = renderCwlRoutes(routes, {
    header: opts.header ?? "# Chrysalis Web Language — runtime-cwl emit",
    moduleName: opts.moduleName ?? "chrysalis",
  });
  return { text, holeCount, routeCount: routes.length };
}
