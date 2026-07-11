/**
 * UI CSS parity report (DESIGN D6365, G9300d).
 *
 * Verifies that the per-route lifted bundles cover every selector that
 * survived de-scoping — i.e. the emitted pages can render with the same rule
 * set the original route loaded. Dropped selectors are only acceptable when
 * the lift itself declared them (invalid/over-broad after the scope strip);
 * anything else is a parity failure, not a warning.
 *
 * This check consumes lift artifacts (bundles with selector inventories);
 * it does not re-parse CSS, so verify stays free of frontend dependencies.
 */
import type { UiRouteStyleMapV1, UiStylesheetBundle } from "@chrysalis/webir";

export const UI_CSS_PARITY_KIND = "chrysalis.verify.ui-css-parity" as const;
export const UI_CSS_PARITY_SCHEMA_VERSION = 1 as const;

export interface UiCssRouteParity {
  readonly routeId: string;
  readonly href: string;
  /** Selectors expected on this route (post-descope inventory). */
  readonly expected: number;
  /** Expected selectors present in the bundle CSS. */
  readonly covered: number;
  /** Expected selectors missing from the bundle CSS (parity failures). */
  readonly missing: ReadonlyArray<string>;
  readonly ok: boolean;
}

export interface UiCssParityReportV1 {
  readonly kind: typeof UI_CSS_PARITY_KIND;
  readonly schemaVersion: typeof UI_CSS_PARITY_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly framework: string;
  readonly routes: ReadonlyArray<UiCssRouteParity>;
  readonly routesChecked: number;
  readonly routesFailed: number;
  /** Map entries with no corresponding bundle (broken emit wiring). */
  readonly unmatchedMapEntries: ReadonlyArray<string>;
}

/** CSS text contains this selector as a rule selector (not inside a value). */
function cssContainsSelector(css: string, selector: string): boolean {
  let from = 0;
  for (;;) {
    const i = css.indexOf(selector, from);
    if (i === -1) return false;
    // Selector occurrences must be followed by "{", ",", or another selector
    // boundary before the next "{" — a cheap structural check that avoids
    // matching property values (e.g. content: ".login-page").
    const rest = css.slice(i + selector.length, i + selector.length + 400);
    const m = /^[^{}]*\{/.exec(rest);
    if (m !== null) return true;
    from = i + selector.length;
  }
}

/**
 * Verify per-route selector coverage of lifted CSS bundles against the map.
 * `bundles` must include the fallback bundle when the map declares one.
 */
export function verifyUiRouteStyleParity(
  map: UiRouteStyleMapV1,
  bundles: ReadonlyArray<UiStylesheetBundle>,
): UiCssParityReportV1 {
  const byHref = new Map<string, UiStylesheetBundle>();
  for (const b of bundles) byHref.set(b.href, b);

  const routes: UiCssRouteParity[] = [];
  const unmatched: string[] = [];
  const hrefsToCheck = [
    ...map.routes.map((r) => ({ routeId: r.routeId, href: r.href })),
    ...(map.fallbackHref !== null ? [{ routeId: "(layout)", href: map.fallbackHref }] : []),
  ];

  for (const entry of hrefsToCheck) {
    const bundle = byHref.get(entry.href);
    if (bundle === undefined) {
      unmatched.push(entry.href);
      continue;
    }
    const missing: string[] = [];
    let covered = 0;
    for (const selector of bundle.selectors) {
      if (cssContainsSelector(bundle.css, selector)) covered += 1;
      else missing.push(selector);
    }
    routes.push({
      routeId: entry.routeId,
      href: entry.href,
      expected: bundle.selectors.length,
      covered,
      missing,
      ok: missing.length === 0,
    });
  }

  const routesFailed = routes.filter((r) => !r.ok).length;
  return {
    kind: UI_CSS_PARITY_KIND,
    schemaVersion: UI_CSS_PARITY_SCHEMA_VERSION,
    ok: routesFailed === 0 && unmatched.length === 0,
    framework: map.framework,
    routes,
    routesChecked: routes.length,
    routesFailed,
    unmatchedMapEntries: unmatched,
  };
}
