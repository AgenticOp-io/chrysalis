/**
 * UI asset lift artifact types (DESIGN D6365, G9300a).
 *
 * A source framework's scoped CSS (Svelte hashes, Vue `data-v-*`, CSS Modules,
 * Angular `_ngcontent-*`) is an isolation mechanism. Lifting it into emitted
 * pages must preserve that isolation at the same granularity: one stylesheet
 * bundle per source route, keyed mechanically from the source build manifest.
 * Concatenating de-scoped CSS globally is forbidden — unrelated components
 * that reuse semantic class names collide (the WISP `.login-page` failure).
 *
 * These types are backend-portable: emit backends consume the map through
 * `@chrysalis/emit-shared` without knowing which framework produced it.
 */
import type { Provenance } from "./index.js";

export const UI_ROUTE_STYLE_MAP_KIND = "chrysalis.ui.route-style-map" as const;
export const UI_ROUTE_STYLE_MAP_SCHEMA_VERSION = 1 as const;

/** One de-scoped, per-route CSS bundle plus everything needed to audit it. */
export interface UiStylesheetBundle {
  /** Source-framework route id (e.g. SvelteKit `"/login"`, `"/portal/[tenantId]"`). */
  readonly routeId: string;
  /** Emitted asset href for the bundle (e.g. `"/assets/original-css/login.css"`). */
  readonly href: string;
  /** De-scoped CSS text. */
  readonly css: string;
  /** Selectors surviving the de-scope, for parity verification. */
  readonly selectors: ReadonlyArray<string>;
  /** Selectors dropped because the strip left them invalid or over-broad. */
  readonly droppedSelectors: ReadonlyArray<string>;
  /** Source stylesheet files (build-relative) this bundle was lifted from. */
  readonly sourceFiles: ReadonlyArray<string>;
  /** Why this bundle exists; every entry uses `source: "ui-asset-lift"`. */
  readonly provenance: ReadonlyArray<Provenance>;
}

/** A binary asset (font/image) referenced via `url(...)` from lifted CSS. */
export interface UiLiftedAssetRef {
  /** Build-relative source path. */
  readonly sourceFile: string;
  /** Emitted asset href (e.g. `"/assets/original/logo.woff2"`). */
  readonly href: string;
}

/** Maps emitted-page pathnames onto per-route bundles. */
export interface UiRouteStyleEntry {
  /** Source-framework route id. */
  readonly routeId: string;
  /** Regex source matching emitted pathnames for this route (anchored). */
  readonly pattern: string;
  /** Bundle href for pages on this route. */
  readonly href: string;
}

/**
 * The portable route→stylesheet map artifact. Emit backends link exactly one
 * bundle per page: the entry whose pattern matches, else `fallbackHref`
 * (the source root layout bundle: theme variables and global styles).
 */
export interface UiRouteStyleMapV1 {
  readonly kind: typeof UI_ROUTE_STYLE_MAP_KIND;
  readonly schemaVersion: typeof UI_ROUTE_STYLE_MAP_SCHEMA_VERSION;
  /** Adapter that produced the map (e.g. `"sveltekit"`). */
  readonly framework: string;
  readonly routes: ReadonlyArray<UiRouteStyleEntry>;
  readonly fallbackHref: string | null;
  readonly assets: ReadonlyArray<UiLiftedAssetRef>;
}

/** Parse + validate a serialized {@link UiRouteStyleMapV1}. */
export type ParseUiRouteStyleMapResult =
  | { ok: true; map: UiRouteStyleMapV1 }
  | { ok: false; error: string };

export function parseUiRouteStyleMapJson(raw: string): ParseUiRouteStyleMapResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `ui-route-style-map: invalid JSON (${(e as Error).message})` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "ui-route-style-map: root must be an object" };
  }
  const o = parsed as Record<string, unknown>;
  if (o.kind !== UI_ROUTE_STYLE_MAP_KIND) {
    return { ok: false, error: `ui-route-style-map: kind must be ${UI_ROUTE_STYLE_MAP_KIND}` };
  }
  if (o.schemaVersion !== UI_ROUTE_STYLE_MAP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `ui-route-style-map: schemaVersion must be ${UI_ROUTE_STYLE_MAP_SCHEMA_VERSION}`,
    };
  }
  if (typeof o.framework !== "string" || o.framework.length === 0) {
    return { ok: false, error: "ui-route-style-map: framework must be a non-empty string" };
  }
  if (!Array.isArray(o.routes)) {
    return { ok: false, error: "ui-route-style-map: routes must be an array" };
  }
  const routes: UiRouteStyleEntry[] = [];
  for (const [i, r] of o.routes.entries()) {
    if (typeof r !== "object" || r === null) {
      return { ok: false, error: `ui-route-style-map: routes[${i}] must be an object` };
    }
    const e = r as Record<string, unknown>;
    if (typeof e.routeId !== "string" || typeof e.pattern !== "string" || typeof e.href !== "string") {
      return {
        ok: false,
        error: `ui-route-style-map: routes[${i}] needs string routeId, pattern, href`,
      };
    }
    try {
      new RegExp(e.pattern);
    } catch {
      return { ok: false, error: `ui-route-style-map: routes[${i}].pattern is not a valid regex` };
    }
    routes.push({ routeId: e.routeId, pattern: e.pattern, href: e.href });
  }
  const fallbackHref = typeof o.fallbackHref === "string" ? o.fallbackHref : null;
  const assets: UiLiftedAssetRef[] = [];
  if (Array.isArray(o.assets)) {
    for (const [i, a] of o.assets.entries()) {
      if (typeof a !== "object" || a === null) {
        return { ok: false, error: `ui-route-style-map: assets[${i}] must be an object` };
      }
      const e = a as Record<string, unknown>;
      if (typeof e.sourceFile !== "string" || typeof e.href !== "string") {
        return { ok: false, error: `ui-route-style-map: assets[${i}] needs string sourceFile, href` };
      }
      assets.push({ sourceFile: e.sourceFile, href: e.href });
    }
  }
  return {
    ok: true,
    map: {
      kind: UI_ROUTE_STYLE_MAP_KIND,
      schemaVersion: UI_ROUTE_STYLE_MAP_SCHEMA_VERSION,
      framework: o.framework,
      routes,
      fallbackHref,
      assets,
    },
  };
}
