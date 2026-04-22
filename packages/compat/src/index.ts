/**
 * @chrysalis/compat — PHP stdlib shim for generated TypeScript.
 *
 * Implementations are intentionally sparse at Milestone 0; each function is
 * filled in as real fixtures demand it, with PHP-faithful semantics for the
 * cases Chrysalis actually encounters.
 */

export function count(x: ArrayLike<unknown> | Record<string, unknown>): number {
  if (Array.isArray(x) || typeof (x as ArrayLike<unknown>).length === "number") {
    return (x as ArrayLike<unknown>).length;
  }
  return Object.keys(x as Record<string, unknown>).length;
}

export function isset<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}

/** PHP's `empty`: true for null, undefined, "", "0", 0, false, [], {}. */
export function empty(x: unknown): boolean {
  if (x === null || x === undefined) return true;
  if (x === false || x === 0 || x === "" || x === "0") return true;
  if (Array.isArray(x) && x.length === 0) return true;
  if (typeof x === "object" && Object.keys(x as object).length === 0) return true;
  return false;
}

export function in_array<T>(needle: T, haystack: ReadonlyArray<T>): boolean {
  return haystack.includes(needle);
}
