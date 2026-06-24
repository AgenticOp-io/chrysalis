/**
 * IR Helper Program inline pattern registry (P1) — authoritative callee + operand metadata.
 * Resolve/emit implementation remains in lib-helper-inline; new patterns register here first.
 */

export type IrHelperInlineOperandKind = "formal" | "literal";

export type IrHelperInlinePatternKind =
  | "formal"
  | "formal_literal"
  | "formal_literal_literal"
  | "formal_literal_literal_numeric"
  | "formal_literal2"
  | "cast_int"
  | "cast_float"
  | "cast_bool";

export type IrHelperInlineRegistryEntry = {
  readonly suffix: string;
  readonly phpCallee: string;
  readonly pattern: IrHelperInlinePatternKind;
  readonly resolveKind: string;
  readonly generic?: boolean;
  readonly literalFirst?: boolean;
  /** For `formal_literal_literal` generic callees: formal operand is last (e.g. preg_replace). */
  readonly formalLast?: boolean;
  readonly emitCallee?: string;
};

export function irHelperEmitCallee(entry: IrHelperInlineRegistryEntry): string {
  return entry.emitCallee ?? entry.phpCallee;
}

/** Chartered I3 callee patterns (frozen at B75). */
export const IR_HELPER_INLINE_REGISTRY: readonly IrHelperInlineRegistryEntry[] = [
  { suffix: "trim", phpCallee: "trim", pattern: "formal", resolveKind: "trimFormal" },
  { suffix: "strlen", phpCallee: "strlen", pattern: "formal", resolveKind: "strlenFormal" },
  { suffix: "empty", phpCallee: "empty", pattern: "formal", resolveKind: "emptyFormal" },
  { suffix: "isset", phpCallee: "isset", pattern: "formal", resolveKind: "issetFormal" },
  { suffix: "count", phpCallee: "count", pattern: "formal", resolveKind: "countFormal" },
  { suffix: "is_array", phpCallee: "is_array", pattern: "formal", resolveKind: "isArrayFormal" },
  { suffix: "is_string", phpCallee: "is_string", pattern: "formal", resolveKind: "isStringFormal" },
  { suffix: "abs", phpCallee: "abs", pattern: "formal", resolveKind: "absFormal" },
  { suffix: "is_numeric", phpCallee: "is_numeric", pattern: "formal", resolveKind: "isNumericFormal" },
  { suffix: "not", phpCallee: "!", pattern: "formal", resolveKind: "notFormal" },
  { suffix: "is_int", phpCallee: "is_int", pattern: "formal", resolveKind: "isIntFormal" },
  { suffix: "is_bool", phpCallee: "is_bool", pattern: "formal", resolveKind: "isBoolFormal" },
  { suffix: "is_null", phpCallee: "is_null", pattern: "formal", resolveKind: "isNullFormal" },
  { suffix: "neg", phpCallee: "-", pattern: "formal", resolveKind: "negFormal" },
  { suffix: "round", phpCallee: "round", pattern: "formal", resolveKind: "roundFormal" },
  { suffix: "floor", phpCallee: "floor", pattern: "formal", resolveKind: "floorFormal" },
  { suffix: "ceil", phpCallee: "ceil", pattern: "formal", resolveKind: "ceilFormal" },
  { suffix: "strtolower", phpCallee: "strtolower", pattern: "formal", resolveKind: "strtolowerFormal" },
  { suffix: "strtoupper", phpCallee: "strtoupper", pattern: "formal", resolveKind: "strtoupperFormal" },
  { suffix: "htmlspecialchars", phpCallee: "htmlspecialchars", pattern: "formal", resolveKind: "htmlspecialcharsFormal" },
  { suffix: "nl2br", phpCallee: "nl2br", pattern: "formal", resolveKind: "nl2brFormal" },
  { suffix: "urlencode", phpCallee: "urlencode", pattern: "formal", resolveKind: "urlencodeFormal" },
  { suffix: "rawurlencode", phpCallee: "rawurlencode", pattern: "formal", resolveKind: "rawurlencodeFormal" },
  { suffix: "urldecode", phpCallee: "urldecode", pattern: "formal", resolveKind: "urldecodeFormal" },
  { suffix: "rawurldecode", phpCallee: "rawurldecode", pattern: "formal", resolveKind: "rawurldecodeFormal" },
  { suffix: "ltrim", phpCallee: "ltrim", pattern: "formal", resolveKind: "ltrimFormal" },
  { suffix: "rtrim", phpCallee: "rtrim", pattern: "formal", resolveKind: "rtrimFormal" },
  { suffix: "is_float", phpCallee: "is_float", pattern: "formal", resolveKind: "isFloatFormal" },
  { suffix: "is_object", phpCallee: "is_object", pattern: "formal", resolveKind: "isObjectFormal" },
  { suffix: "is_scalar", phpCallee: "is_scalar", pattern: "formal", resolveKind: "isScalarFormal" },
  { suffix: "round2", phpCallee: "round", pattern: "formal_literal", resolveKind: "roundFormal2" },
  { suffix: "max", phpCallee: "max", pattern: "formal_literal", resolveKind: "maxFormalLiteral" },
  { suffix: "min", phpCallee: "min", pattern: "formal_literal", resolveKind: "minFormalLiteral" },
  { suffix: "substr", phpCallee: "substr", pattern: "formal_literal", resolveKind: "substrFormalLiteral" },
  { suffix: "strpos", phpCallee: "strpos", pattern: "formal_literal", resolveKind: "strposFormalLiteral" },
  { suffix: "stripos", phpCallee: "stripos", pattern: "formal_literal", resolveKind: "striposFormalLiteral" },
  { suffix: "strrpos", phpCallee: "strrpos", pattern: "formal_literal", resolveKind: "strrposFormalLiteral" },
  { suffix: "strripos", phpCallee: "strripos", pattern: "formal_literal", resolveKind: "strriposFormalLiteral" },
  { suffix: "str_contains", phpCallee: "str_contains", pattern: "formal_literal", resolveKind: "strContainsFormalLiteral" },
  { suffix: "str_starts_with", phpCallee: "str_starts_with", pattern: "formal_literal", resolveKind: "strStartsWithFormalLiteral" },
  { suffix: "str_ends_with", phpCallee: "str_ends_with", pattern: "formal_literal", resolveKind: "strEndsWithFormalLiteral" },
  { suffix: "substr_count", phpCallee: "substr_count", pattern: "formal_literal", resolveKind: "substrCountFormalLiteral" },
  { suffix: "explode", phpCallee: "explode", pattern: "formal_literal", resolveKind: "explodeFormalLiteral" },
  { suffix: "strcmp", phpCallee: "strcmp", pattern: "formal_literal", resolveKind: "strcmpFormalLiteral" },
  { suffix: "strcasecmp", phpCallee: "strcasecmp", pattern: "formal_literal", resolveKind: "strcasecmpFormalLiteral" },
  { suffix: "strncmp", phpCallee: "strncmp", pattern: "formal_literal_literal_numeric", resolveKind: "strncmpFormalLiteral2" },
  { suffix: "strncasecmp", phpCallee: "strncasecmp", pattern: "formal_literal_literal_numeric", resolveKind: "strncasecmpFormalLiteral2" },
  { suffix: "strrev", phpCallee: "strrev", pattern: "formal", resolveKind: "strrevFormal" },
  { suffix: "str_repeat", phpCallee: "str_repeat", pattern: "formal_literal", resolveKind: "strRepeatFormalLiteral" },
  { suffix: "str_pad", phpCallee: "str_pad", pattern: "formal_literal2", resolveKind: "strPadFormalLiteral2" },
  { suffix: "cast_float", phpCallee: "floatval", pattern: "cast_float", resolveKind: "floatCast" },
  { suffix: "cast_bool", phpCallee: "boolval", pattern: "cast_bool", resolveKind: "boolCast" },
  { suffix: "cast_int", phpCallee: "intval", pattern: "cast_int", resolveKind: "cast_int" },
  { suffix: "str_replace", phpCallee: "str_replace", pattern: "formal_literal_literal", resolveKind: "strReplaceFormalLiteral2" },
  { suffix: "str_ireplace", phpCallee: "str_ireplace", pattern: "formal_literal_literal", resolveKind: "strIreplaceFormalLiteral2" },
  { suffix: "ucfirst", phpCallee: "ucfirst", pattern: "formal", resolveKind: "ucfirstFormal" },
  { suffix: "lcfirst", phpCallee: "lcfirst", pattern: "formal", resolveKind: "lcfirstFormal" },
  { suffix: "ucwords", phpCallee: "ucwords", pattern: "formal", resolveKind: "ucwordsFormal" },
  { suffix: "strip_tags", phpCallee: "strip_tags", pattern: "formal", resolveKind: "stripTagsFormal" },
  { suffix: "addslashes", phpCallee: "addslashes", pattern: "formal", resolveKind: "addslashesFormal" },
  { suffix: "stripslashes", phpCallee: "stripslashes", pattern: "formal", resolveKind: "stripslashesFormal" },
  { suffix: "str_rot13", phpCallee: "str_rot13", pattern: "formal", resolveKind: "strRot13Formal" },
  { suffix: "str_word_count", phpCallee: "str_word_count", pattern: "formal", resolveKind: "strWordCountFormal" },
  { suffix: "str_split", phpCallee: "str_split", pattern: "formal_literal", resolveKind: "strSplitFormalLiteral" },
  { suffix: "strcspn", phpCallee: "strcspn", pattern: "formal_literal", resolveKind: "strcspnFormalLiteral" },
  { suffix: "strspn", phpCallee: "strspn", pattern: "formal_literal", resolveKind: "strspnFormalLiteral" },
  { suffix: "ltrim_charlist", phpCallee: "ltrim", pattern: "formal_literal", resolveKind: "ltrimFormalLiteral" },
  { suffix: "rtrim_charlist", phpCallee: "rtrim", pattern: "formal_literal", resolveKind: "rtrimFormalLiteral" },
  { suffix: "trim_charlist", phpCallee: "trim", pattern: "formal_literal", resolveKind: "trimFormalLiteral" },
  { suffix: "wordwrap", phpCallee: "wordwrap", pattern: "formal_literal_literal", resolveKind: "wordwrapFormalLiteral2" },
  { suffix: "chunk_split", phpCallee: "chunk_split", pattern: "formal_literal_literal", resolveKind: "chunkSplitFormalLiteral2" },
  { suffix: "strtr", phpCallee: "strtr", pattern: "formal_literal_literal", resolveKind: "strtrFormalLiteral2" },
  { suffix: "htmlentities", phpCallee: "htmlentities", pattern: "formal", resolveKind: "htmlentitiesFormal" },
  { suffix: "html_entity_decode", phpCallee: "html_entity_decode", pattern: "formal", resolveKind: "htmlEntityDecodeFormal" },
  // P3 maintenance batch 1 — generic registry-driven resolve/emit (D6256)
  { suffix: "json_encode", phpCallee: "json_encode", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "json_decode", phpCallee: "json_decode", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "md5", phpCallee: "md5", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "sha1", phpCallee: "sha1", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "base64_encode", phpCallee: "base64_encode", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "base64_decode", phpCallee: "base64_decode", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "bin2hex", phpCallee: "bin2hex", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "preg_quote", phpCallee: "preg_quote", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "parse_url", phpCallee: "parse_url", pattern: "formal", resolveKind: "genericFormal", generic: true, emitCallee: "parseUrlParts" },
  { suffix: "basename", phpCallee: "basename", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "dirname", phpCallee: "dirname", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "gettype", phpCallee: "gettype", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "is_callable", phpCallee: "is_callable", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "is_resource", phpCallee: "is_resource", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "ord", phpCallee: "ord", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "chr", phpCallee: "chr", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "preg_match", phpCallee: "preg_match", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: true },
  { suffix: "hash", phpCallee: "hash", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: true },
  { suffix: "sprintf", phpCallee: "sprintf", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: true },
  { suffix: "number_format2", phpCallee: "number_format", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: false },
  // P3 maintenance batch 2 — remaining safe formal-assign gaps (D6257)
  { suffix: "implode", phpCallee: "implode", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: true },
  { suffix: "preg_replace", phpCallee: "preg_replace", pattern: "formal_literal_literal", resolveKind: "genericFormalLiteral2", generic: true, formalLast: true },
  { suffix: "preg_split", phpCallee: "preg_split", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: true },
  { suffix: "hexdec", phpCallee: "hexdec", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "dechex", phpCallee: "dechex", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "strval", phpCallee: "strval", pattern: "formal", resolveKind: "genericFormal", generic: true },
  { suffix: "filter_var", phpCallee: "filter_var", pattern: "formal_literal", resolveKind: "genericFormalLiteral", generic: true, literalFirst: false },
  { suffix: "crc32", phpCallee: "crc32", pattern: "formal", resolveKind: "genericFormal", generic: true },
] as const;

export const IR_HELPER_GENERIC_CALLEE_MAP: ReadonlyMap<string, IrHelperInlineRegistryEntry> = new Map(
  IR_HELPER_INLINE_REGISTRY.filter((e) => e.generic === true).map((e) => [e.phpCallee, e] as const),
);

export const IR_HELPER_INLINE_CALLEE_IDS = IR_HELPER_INLINE_REGISTRY.map(
  (e) => `chrysalis_sql_param_${e.suffix}` as const,
);

/** Effect-free PHP callees allowed as prelude skips before the final return query. */
const EXTRA_PRELUDE_CALLEES = ["empty", "isset"] as const;

export const IR_HELPER_SKIPPABLE_PRELUDE_CALLEES: ReadonlySet<string> = new Set([
  ...IR_HELPER_INLINE_REGISTRY.map((e) => e.phpCallee).filter((c) => c !== "!" && c !== "-"),
  ...EXTRA_PRELUDE_CALLEES,
]);

export function isIrHelperSkippablePreludeCallee(callee: string): boolean {
  return IR_HELPER_SKIPPABLE_PRELUDE_CALLEES.has(callee);
}

export function registryEntryForHelperId(helperId: string): IrHelperInlineRegistryEntry | undefined {
  if (!helperId.startsWith("chrysalis_sql_param_")) return undefined;
  const suffix = helperId.slice("chrysalis_sql_param_".length);
  return IR_HELPER_INLINE_REGISTRY.find((e) => e.suffix === suffix);
}
