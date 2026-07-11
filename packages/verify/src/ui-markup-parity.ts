/**
 * UI markup parity report (DESIGN D6365 extension, G9306).
 */
import type { UiMarkupBundle, UiRouteMarkupMapV1 } from "@chrysalis/webir";

export const UI_MARKUP_PARITY_KIND = "chrysalis.verify.ui-markup-parity" as const;
export const UI_MARKUP_PARITY_SCHEMA_VERSION = 1 as const;

export interface UiMarkupRouteParity {
  readonly routeId: string;
  readonly href: string;
  readonly expectedClasses: number;
  readonly coveredClasses: number;
  readonly missingClasses: ReadonlyArray<string>;
  readonly ok: boolean;
}

export interface UiMarkupParityReportV1 {
  readonly kind: typeof UI_MARKUP_PARITY_KIND;
  readonly schemaVersion: typeof UI_MARKUP_PARITY_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly framework: string;
  readonly routes: ReadonlyArray<UiMarkupRouteParity>;
  readonly routesChecked: number;
  readonly routesFailed: number;
  readonly unmatchedMapEntries: ReadonlyArray<string>;
}

function htmlContainsClass(html: string, className: string): boolean {
  const re = new RegExp(`class\\s*=\\s*(['"])([^'"]*\\b${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^'"]*)\\1`);
  return re.test(html);
}

/** Verify per-route class-name inventory is present in lifted HTML bundles. */
export function verifyUiRouteMarkupParity(
  map: UiRouteMarkupMapV1,
  bundles: ReadonlyArray<UiMarkupBundle>,
): UiMarkupParityReportV1 {
  const byHref = new Map<string, UiMarkupBundle>();
  for (const b of bundles) byHref.set(b.href, b);

  const routes: UiMarkupRouteParity[] = [];
  const unmatched: string[] = [];

  for (const entry of map.routes) {
    const bundle = byHref.get(entry.href);
    if (bundle === undefined) {
      unmatched.push(entry.href);
      continue;
    }
    const missing: string[] = [];
    let covered = 0;
    for (const className of bundle.classNames) {
      if (htmlContainsClass(bundle.html, className)) covered += 1;
      else missing.push(className);
    }
    routes.push({
      routeId: entry.routeId,
      href: entry.href,
      expectedClasses: bundle.classNames.length,
      coveredClasses: covered,
      missingClasses: missing,
      ok: missing.length === 0,
    });
  }

  const routesFailed = routes.filter((r) => !r.ok).length;
  return {
    kind: UI_MARKUP_PARITY_KIND,
    schemaVersion: UI_MARKUP_PARITY_SCHEMA_VERSION,
    ok: routesFailed === 0 && unmatched.length === 0,
    framework: map.framework,
    routes,
    routesChecked: routes.length,
    routesFailed,
    unmatchedMapEntries: unmatched,
  };
}
