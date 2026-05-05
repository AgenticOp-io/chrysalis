/**
 * Deterministic JSON serialization for signing bytes (sorted object keys, recursive).
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }
  if (t !== "object") {
    throw new TypeError(`canonicalStringify: unsupported type ${t}`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return `{${parts.join(",")}}`;
}
