/**
 * Emit-time grouping of routes whose lowered handler bodies are identical (**DESIGN D282**).
 * Keys are derived from **`EmittedHandler`** + effect tags only (not WebIR node ids).
 */

import type { EmittedHandler } from "./emit-tree.js";
import { sha256Utf8Hex } from "./emit-handler-fingerprints.js";

/**
 * Canonical JSON string for grouping handlers. Two jobs with the same key may share one
 * lowered implementation module (**`src/chrysalis-deduped/*.ts`**).
 */
export function computeEmittedHandlerDedupeKey(
  emitted: EmittedHandler,
  effectTags: ReadonlyArray<string>,
): string {
  const tags = [...effectTags].sort((a, b) => a.localeCompare(b));
  const domain = [...emitted.domainTypeImports].sort((a, b) => a.localeCompare(b));
  return JSON.stringify({
    body: emitted.body,
    shape: emitted.shape,
    tags,
    domain,
    usesQueryAllWhereIn: emitted.usesQueryAllWhereIn,
    usesChrysalisBatchHelpers: emitted.usesChrysalisBatchHelpers,
    usesZod: emitted.usesZod,
    usesPhpFqnNew: emitted.usesPhpFqnNew,
    usesPhpDynamicNew: emitted.usesPhpDynamicNew,
  });
}

/** Stable export name for a dedupe group (valid TS identifier). */
export function chrysalisBodyDedupeExportId(dedupeKey: string): string {
  return `chrysalisBodyDedupe_${sha256Utf8Hex(dedupeKey).slice(0, 16)}`;
}
