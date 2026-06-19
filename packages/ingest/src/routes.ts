import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface RouteManifest {
  readonly app: string;
  readonly routes: ReadonlyArray<RouteSpec>;
  /**
   * Normalized PHP callee labels (`Class::method` or global function name) that
   * the project declares return a DB connection whose `->query(...)` may be
   * lowered to `effect.db.query`. No inference — manifest-only provenance.
   */
  readonly dbFactoryReturnCallees?: ReadonlyArray<string>;
  /**
   * WordPress / wp_* global callees the project declares as `effect.wp.call`
   * (manifest-only — no body inference). Omission keeps `data.call` holes.
   */
  readonly wordpressEffectCallees?: ReadonlyArray<string>;
}

export interface RouteSpec {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly file: string;
  readonly pathParams: ReadonlyArray<{ name: string; type: "int" | "string"; phpVar?: string }>;
}

/** Strip leading `\\` from a callee label for stable manifest matching. */
export function normalizeDbFactoryCalleeLabel(label: string): string {
  return label.replace(/^\\+/, "").trim();
}

/** Build the set used during ingest for assignment and `->query` receiver checks. */
export function dbFactoryReturnCalleeSet(manifest: RouteManifest): ReadonlySet<string> {
  const raw = manifest.dbFactoryReturnCallees;
  if (!raw || !Array.isArray(raw)) return new Set();
  return new Set(raw.map(normalizeDbFactoryCalleeLabel).filter((s) => s.length > 0));
}

/** Build the set used during ingest for manifest-declared wp_* effect lowering. */
export function wordpressEffectCalleeSet(manifest: RouteManifest): ReadonlySet<string> {
  const raw = manifest.wordpressEffectCallees;
  if (!raw || !Array.isArray(raw)) return new Set();
  return new Set(raw.map(normalizeDbFactoryCalleeLabel).filter((s) => s.length > 0));
}

export async function loadRouteManifest(root: string): Promise<RouteManifest> {
  const manifestPath = resolve(root, "chrysalis.routes.json");
  const contents = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(contents) as RouteManifest;
  return parsed;
}
