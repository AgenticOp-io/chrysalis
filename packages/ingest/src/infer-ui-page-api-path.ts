/**
 * Infer a REST API path for a UI page route (G9480 / load-bind seeding).
 *
 * General prefix map — not WISP-only; WISP Module_Manager paths are the
 * primary showcase corpus.
 */
const PREFIX_API_MAP: ReadonlyArray<readonly [string, string]> = [
  ["/modules/inventory", "/api/inventory"],
  ["/modules/customers", "/api/customers"],
  ["/modules/monitor", "/api/monitoring"],
  ["/modules/monitoring", "/api/monitoring/graphs"],
  ["/modules/hss-management", "/api/hss"],
  ["/modules/work-orders", "/api/work-orders"],
  ["/modules/deploy", "/api/deploy"],
  ["/modules/plan", "/api/plans"],
  ["/modules/coverage-map", "/api/network"],
  ["/modules/billing", "/api/customer-billing"],
  ["/modules/maintain", "/api/maintain"],
  ["/modules/voice-telephony", "/api/voice"],
  ["/modules/hardware", "/api/inventory"],
  ["/modules/sites", "/api/network"],
  ["/modules/pci-resolution", "/api/network"],
  ["/modules/help-desk", "/api/maintain"],
  ["/modules/tenant-management", "/api/tenants"],
  ["/modules/user-management", "/api/users"],
  ["/modules/acs-cpe-management", "/api/snmp"],
  ["/modules/backend-management", "/api/admin"],
  ["/modules/cbrs-management", "/api/network"],
  ["/modules/customers/portal", "/api/customers"],
  ["/dashboard", "/api/admin"],
  ["/login", "/api/admin"],
];

/** Infer `apiPath` for a UI `@page` from its HTTP path. */
export function inferUiPageApiPath(httpPath: string): string | null {
  const p = httpPath.replace(/\/$/, "") || "/";
  for (const [prefix, api] of PREFIX_API_MAP) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return api;
  }
  if (p.startsWith("/admin")) return "/api/admin";
  if (p.startsWith("/docs") || p === "/help" || p.startsWith("/help")) return null;
  if (p.startsWith("/modules/")) {
    const seg = p.split("/")[2];
    if (seg !== undefined && seg.length > 0) return `/api/${seg.replace(/-/g, "")}`;
  }
  return null;
}
