/**
 * UI markup lift artifact types (DESIGN D6365 extension, G9306).
 *
 * Structural HTML parity complements per-route CSS lift: one static HTML
 * fragment per source route, keyed from the source file manifest (e.g.
 * SvelteKit `+page.svelte` paths). Unsupported template semantics hole;
 * never best-guess partial component trees.
 */
import type { Provenance } from "./index.js";

export const UI_ROUTE_MARKUP_MAP_KIND = "chrysalis.ui.route-markup-map" as const;
export const UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION = 1 as const;

/** How the HTML fragment was produced (DESIGN D6367). */
export type UiMarkupLiftMode = "static" | "structural-shell";

/** Explicit hole recorded when structural-shell lift strips dynamic constructs. */
export interface UiMarkupLiftHoleRecord {
  readonly reason: string;
  readonly detail: string;
}

/** One lifted static HTML fragment for a source route. */
export interface UiMarkupBundle {
  readonly routeId: string;
  readonly href: string;
  readonly html: string;
  /** Semantic class names present in the lifted HTML (parity inventory). */
  readonly classNames: ReadonlyArray<string>;
  readonly sourceFiles: ReadonlyArray<string>;
  readonly provenance: ReadonlyArray<Provenance>;
  /** `static` when fully static; `structural-shell` when dynamics became holes (D6367). */
  readonly liftMode?: UiMarkupLiftMode;
  /** Holes declared for stripped dynamic constructs (empty / omitted for static). */
  readonly holes?: ReadonlyArray<UiMarkupLiftHoleRecord>;
}

export interface UiRouteMarkupEntry {
  readonly routeId: string;
  readonly pattern: string;
  readonly href: string;
}

export interface UiRouteMarkupMapV1 {
  readonly kind: typeof UI_ROUTE_MARKUP_MAP_KIND;
  readonly schemaVersion: typeof UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION;
  readonly framework: string;
  readonly routes: ReadonlyArray<UiRouteMarkupEntry>;
  readonly fallbackHref: string | null;
}

export type ParseUiRouteMarkupMapResult =
  | { ok: true; map: UiRouteMarkupMapV1 }
  | { ok: false; error: string };

export function parseUiRouteMarkupMapJson(raw: string): ParseUiRouteMarkupMapResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `ui-route-markup-map: invalid JSON (${(e as Error).message})` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "ui-route-markup-map: root must be an object" };
  }
  const o = parsed as Record<string, unknown>;
  if (o.kind !== UI_ROUTE_MARKUP_MAP_KIND) {
    return { ok: false, error: `ui-route-markup-map: kind must be ${UI_ROUTE_MARKUP_MAP_KIND}` };
  }
  if (o.schemaVersion !== UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `ui-route-markup-map: schemaVersion must be ${UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION}`,
    };
  }
  if (typeof o.framework !== "string" || o.framework.length === 0) {
    return { ok: false, error: "ui-route-markup-map: framework must be a non-empty string" };
  }
  if (!Array.isArray(o.routes)) {
    return { ok: false, error: "ui-route-markup-map: routes must be an array" };
  }
  const routes: UiRouteMarkupEntry[] = [];
  for (const [i, r] of o.routes.entries()) {
    if (typeof r !== "object" || r === null) {
      return { ok: false, error: `ui-route-markup-map: routes[${i}] must be an object` };
    }
    const e = r as Record<string, unknown>;
    if (typeof e.routeId !== "string" || typeof e.pattern !== "string" || typeof e.href !== "string") {
      return {
        ok: false,
        error: `ui-route-markup-map: routes[${i}] needs string routeId, pattern, href`,
      };
    }
    try {
      new RegExp(e.pattern);
    } catch {
      return { ok: false, error: `ui-route-markup-map: routes[${i}].pattern is not a valid regex` };
    }
    routes.push({ routeId: e.routeId, pattern: e.pattern, href: e.href });
  }
  const fallbackHref = typeof o.fallbackHref === "string" ? o.fallbackHref : null;
  return {
    ok: true,
    map: {
      kind: UI_ROUTE_MARKUP_MAP_KIND,
      schemaVersion: UI_ROUTE_MARKUP_MAP_SCHEMA_VERSION,
      framework: o.framework,
      routes,
      fallbackHref,
    },
  };
}
