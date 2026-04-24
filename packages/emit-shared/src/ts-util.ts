/** Utilities for synthesizing TypeScript source text. */

export function ident(name: string): string {
  const reserved = new Set([
    "class",
    "function",
    "new",
    "default",
    "return",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "this",
    "super",
    "throw",
    "try",
    "catch",
    "finally",
    "const",
    "let",
    "var",
    "null",
    "undefined",
    "void",
    "in",
    "of",
    "typeof",
    "instanceof",
    "delete",
    "yield",
    "async",
    "await",
    "with",
    "enum",
    "export",
    "import",
    "extends",
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "static",
  ]);
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "_");
  const safe = /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
  return reserved.has(safe) ? `${safe}_` : safe;
}

export function stringLit(v: string): string {
  return JSON.stringify(v);
}

export function jsonLit(v: unknown): string {
  return JSON.stringify(v);
}

export function indent(lines: string, by = "  "): string {
  return lines
    .split("\n")
    .map((l) => (l.length === 0 ? l : by + l))
    .join("\n");
}
