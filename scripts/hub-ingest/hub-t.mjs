/**
 * Thin WebIR type literals for CWL ingest helpers.
 * Avoids importing convert hub-lift-webir-route.mjs (fat origin/COBOL surface).
 */

export const HUB_T = {
  string: { kind: "string" },
  int: { kind: "int" },
  bool: { kind: "bool" },
  unknown: { kind: "unknown" },
};
