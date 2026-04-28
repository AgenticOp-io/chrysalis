/**
 * Shared heuristics for PHP auth-boundary / identity-adjacent symbols (Milestone 6A).
 * Used by ingest (`data.hole` reasons) and emit (unresolved call holes).
 * Conservative false positives are acceptable in tagging; false negatives are not.
 */

export function isAuthBoundaryCallee(callee: string): boolean {
  const n = callee.trim().replace(/^\\+/, "");
  const lower = n.toLowerCase();
  if (lower === "auth") return true;
  if (lower.includes("csrf")) return true;
  if (lower.includes("sanctum") || lower.includes("passport")) return true;
  // Laravel OAuth / login scaffolding (widened Milestone 6A charter — DESIGN D189).
  if (lower.includes("socialite")) return true;
  if (lower.includes("fortify")) return true;
  if (lower.includes("oauth")) return true;
  if (
    lower.includes("gate::") ||
    lower.includes("\\gate\\") ||
    lower.includes("facades\\gate") ||
    lower.includes("\\illuminate\\auth\\")
  ) {
    return true;
  }
  if (
    lower.startsWith("auth::") ||
    lower.includes("\\auth\\") ||
    lower.includes("\\authorization\\")
  ) {
    return true;
  }
  return false;
}

/**
 * Prefix `auth:` on ingest hole reasons when the reason text clearly references an
 * auth-boundary construct (whole reason or a callee-like token inside it).
 */
export function authTaggedHoleReason(reason: string): string {
  if (reason.startsWith("auth:")) return reason;
  if (isAuthBoundaryCallee(reason)) return `auth:${reason}`;
  for (const t of reason.split(/[\s,;:[\](){}]+/).filter((t) => t.length > 0)) {
    if (isAuthBoundaryCallee(t)) return `auth:${reason}`;
  }
  return reason;
}
