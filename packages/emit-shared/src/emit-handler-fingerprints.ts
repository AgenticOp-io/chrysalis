/**
 * Per-handler SHA-256 of emitted TypeScript source (V2-M4 drift, DESIGN D259).
 * Does not hash `server.ts` scaffolding — only route handler modules as emitted this run.
 */

import { createHash } from "node:crypto";

export const EMIT_HANDLER_FINGERPRINTS_KIND = "chrysalis.emit.handlerFingerprints" as const;

export const EMIT_HANDLER_FINGERPRINTS_SCHEMA_VERSION = 1 as const;

export function sha256Utf8Hex(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

export function buildEmitHandlerFingerprintsJson(input: {
  readonly handlers: ReadonlyArray<{ readonly name: string; readonly sourceSha256: string }>;
  readonly sourceApp?: string;
  readonly toolVersion?: string;
}): string {
  const sorted = [...input.handlers].sort((a, b) => a.name.localeCompare(b.name));
  const handlers: Record<string, string> = {};
  for (const h of sorted) handlers[h.name] = h.sourceSha256;
  const doc: Record<string, unknown> = {
    kind: EMIT_HANDLER_FINGERPRINTS_KIND,
    schemaVersion: EMIT_HANDLER_FINGERPRINTS_SCHEMA_VERSION,
    handlers,
  };
  if (input.sourceApp !== undefined) doc.sourceApp = input.sourceApp;
  if (input.toolVersion !== undefined) doc.toolVersion = input.toolVersion;
  return `${JSON.stringify(doc, null, 2)}\n`;
}
