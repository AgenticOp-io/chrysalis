/**
 * @chrysalis/ingest — PHP frontend. AST JSON → WebIR Module.
 */

import { resolve } from "node:path";
import { parseFile } from "@chrysalis/parser-bridge";
import { ModuleBuilder, type Module } from "@chrysalis/webir";
import { ingestHandler } from "./convert.js";
import { buildCallEffectMap } from "./library-effects.js";
import { loadRouteManifest, type RouteManifest, type RouteSpec } from "./routes.js";

async function sourceAppFromProjectRoot(projectRoot: string): Promise<string> {
  if (projectRoot === "") return "single-file";
  try {
    return (await loadRouteManifest(projectRoot)).app;
  } catch {
    return "single-file";
  }
}

export interface IngestOptions {
  readonly include?: ReadonlyArray<string>;
  readonly exclude?: ReadonlyArray<string>;
  readonly holePolicy?: "liberal" | "strict";
}

/** Options for {@link ingestFile} parity with {@link ingestDirectory} call widening. */
export interface IngestFileOptions {
  /**
   * Project root containing `lib/` and `chrysalis.routes.json`. When set,
   * {@link buildCallEffectMap} runs with this route spec so handler effects
   * include `lib/` and same-file hoisted functions (same as directory ingest).
   */
  readonly projectRoot?: string;
}

export async function ingestDirectory(
  root: string,
  _opts?: IngestOptions,
): Promise<Module> {
  const manifest = await loadRouteManifest(root);
  const callEffects = await buildCallEffectMap(root, manifest.routes);
  const builder = new ModuleBuilder({ sourceApp: manifest.app });
  for (const route of manifest.routes) {
    const ast = await parseFile(resolve(root, route.file));
    const routeNode = ingestHandler(builder, ast, route, callEffects);
    builder.addRoot(routeNode);
  }
  return builder.finish();
}

export async function ingestFile(
  phpPath: string,
  route: RouteSpec,
  opts?: IngestFileOptions,
): Promise<Module> {
  const ast = await parseFile(phpPath);
  const root = opts?.projectRoot ? resolve(opts.projectRoot) : "";
  const callEffects =
    root !== "" ? await buildCallEffectMap(root, [route]) : new Map();
  const builder = new ModuleBuilder({ sourceApp: await sourceAppFromProjectRoot(root) });
  const routeNode = ingestHandler(builder, ast, route, callEffects);
  builder.addRoot(routeNode);
  return builder.finish();
}

export { buildCallEffectMap, buildLibraryCallEffectMap } from "./library-effects.js";
export { loadRouteManifest };
export type { RouteManifest, RouteSpec };
