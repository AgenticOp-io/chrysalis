/**
 * Ingest wrapper — delegates body-shape extract to @chrysalis/emit-shared (single source of truth).
 */
import type { Module, NodeId } from "@chrysalis/webir";
import type { ModuleBuilder } from "@chrysalis/webir";
import { tryExtractInlineQuery as extractInlineQueryShared } from "@chrysalis/emit-shared";

type SharedExtract = NonNullable<ReturnType<typeof extractInlineQueryShared>>;

/** Ingest naming: formal passthrough map is localToArg (emit-shared uses localToFormal). */
export type IngestExtractedInlineQuery = Omit<SharedExtract, "localToFormal"> & {
  readonly localToArg: SharedExtract["localToFormal"];
};

export function tryExtractInlineQueryFromModule(
  m: ModuleBuilder,
  bodyId: NodeId,
  paramNames: readonly string[],
): IngestExtractedInlineQuery | undefined {
  const extracted = extractInlineQueryShared(m, bodyId, paramNames);
  if (extracted === undefined) return undefined;
  const { localToFormal, ...rest } = extracted;
  return { ...rest, localToArg: localToFormal };
}
