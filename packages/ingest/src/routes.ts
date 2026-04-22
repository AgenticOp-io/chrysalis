import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface RouteManifest {
  readonly app: string;
  readonly routes: ReadonlyArray<RouteSpec>;
}

export interface RouteSpec {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly file: string;
  readonly pathParams: ReadonlyArray<{ name: string; type: "int" | "string"; phpVar?: string }>;
}

export async function loadRouteManifest(root: string): Promise<RouteManifest> {
  const manifestPath = resolve(root, "chrysalis.routes.json");
  const contents = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(contents) as RouteManifest;
  return parsed;
}
