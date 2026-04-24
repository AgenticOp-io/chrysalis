/**
 * @chrysalis/ingest — PHP frontend. AST JSON → WebIR Module.
 */

import { resolve } from "node:path";
import { parseFile } from "@chrysalis/parser-bridge";
import { ModuleBuilder, type Module } from "@chrysalis/webir";
import { ingestHandler } from "./convert.js";
import { buildLibraryCallEffectMap } from "./library-effects.js";
import { loadRouteManifest, type RouteManifest, type RouteSpec } from "./routes.js";

export interface IngestOptions {
  readonly include?: ReadonlyArray<string>;
  readonly exclude?: ReadonlyArray<string>;
  readonly holePolicy?: "liberal" | "strict";
}

export async function ingestDirectory(
  root: string,
  _opts?: IngestOptions,
): Promise<Module> {
  const manifest = await loadRouteManifest(root);
  const libCallEffects = await buildLibraryCallEffectMap(root);
  const builder = new ModuleBuilder({ sourceApp: manifest.app });
  for (const route of manifest.routes) {
    const ast = await parseFile(resolve(root, route.file));
    const routeNode = ingestHandler(builder, ast, route, libCallEffects);
    builder.addRoot(routeNode);
  }
  return builder.finish();
}

export async function ingestFile(
  phpPath: string,
  route: RouteSpec,
): Promise<Module> {
  const ast = await parseFile(phpPath);
  const builder = new ModuleBuilder({ sourceApp: "single-file" });
  const routeNode = ingestHandler(builder, ast, route);
  builder.addRoot(routeNode);
  return builder.finish();
}

export { buildLibraryCallEffectMap };
export { loadRouteManifest };
export type { RouteManifest, RouteSpec };
