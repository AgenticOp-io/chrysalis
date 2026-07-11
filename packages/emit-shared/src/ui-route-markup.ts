/**
 * Backend-agnostic consumption of the UI route→markup map (G9308).
 */
import type { UiMarkupBundle, UiRouteMarkupMapV1 } from "@chrysalis/webir";

/** Resolve the markup bundle href for an emitted page pathname. */
export function resolveRouteMarkupHref(map: UiRouteMarkupMapV1, pathname: string): string | null {
  const clean = pathname.split("?")[0] ?? "/";
  const normalized = clean === "" ? "/" : clean;
  for (const route of map.routes) {
    if (new RegExp(route.pattern).test(normalized)) return route.href;
  }
  return map.fallbackHref;
}

/** Find the lifted markup bundle for a pathname. */
export function findRouteMarkupBundle(
  map: UiRouteMarkupMapV1,
  bundles: ReadonlyArray<UiMarkupBundle>,
  pathname: string,
): UiMarkupBundle | null {
  const href = resolveRouteMarkupHref(map, pathname);
  if (href === null) return null;
  return bundles.find((b) => b.href === href) ?? null;
}
