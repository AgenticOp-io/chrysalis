/** Shared route-id helpers for UI asset lift adapters (DESIGN D6365). */

/** Route id (e.g. "/portal/[tenantId]") -> anchored pathname regex source. */
export function uiRoutePatternSource(routeId: string): string {
  const escaped = routeId
    .split("/")
    .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return `^${escaped === "" ? "/" : escaped}/?$`;
}

/** Route id -> URL-safe bundle slug. */
export function uiRouteBundleSlug(routeId: string): string {
  if (routeId === "/") return "root";
  const slug = routeId.replace(/^\//, "").replace(/[^a-zA-Z0-9-]+/g, "_");
  return slug.length > 0 ? slug : "root";
}
