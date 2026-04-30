/**
 * Merge multiple `traces/` directory trees into one layout compatible with
 * {@link readCorpus} (V2-M3): output uses `YYYY-MM-DD` day directories with `.ndjson` files.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type CorpusMergeDuplicatePolicy = "error" | "skip";
export type CorpusMergeTraceIdPolicy = "off" | "skip";

export interface MergeCorpusDirectoriesResult {
  readonly copiedFiles: number;
  readonly skippedDuplicates: number;
  readonly skippedTraceIdDuplicates: number;
}

export interface MergeCorpusDirectoriesOptions {
  /** Absolute or relative roots, each shaped like `readCorpus({ root })` expects. */
  readonly sources: readonly string[];
  /** Output directory (created if missing). Should be empty or duplicates handled by policy. */
  readonly outDir: string;
  /** When the same `day/file.ndjson` appears in more than one source: `error` (default) or `skip` (keep first). */
  readonly onDuplicate?: CorpusMergeDuplicatePolicy;
  /**
   * Optional content-level dedupe by trace header `traceId`.
   * - `off` (default): do not inspect file contents.
   * - `skip`: if traceId already copied in this run, skip later files.
   */
  readonly dedupeTraceId?: CorpusMergeTraceIdPolicy;
}

function readHeaderTraceId(ndjsonPath: string): string | null {
  const text = readFileSync(ndjsonPath, "utf8");
  const nl = text.indexOf("\n");
  const firstLine = (nl >= 0 ? text.slice(0, nl) : text).trim();
  if (firstLine.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(firstLine);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { type?: unknown; traceId?: unknown };
  if (obj.type !== "header") return null;
  return typeof obj.traceId === "string" && obj.traceId.length > 0 ? obj.traceId : null;
}

/**
 * Copy all `.ndjson` trace files from each source's day subdirectories into `outDir`, preserving
 * `YYYY-MM-DD/<name>.ndjson` paths. Does not rewrite trace contents.
 *
 * When `onDuplicate` is `skip`, the first source in `sources` order wins when the
 * same relative path appears again.
 */
export function mergeCorpusDirectories(options: MergeCorpusDirectoriesOptions): MergeCorpusDirectoriesResult {
  const policy: CorpusMergeDuplicatePolicy = options.onDuplicate ?? "error";
  const traceIdPolicy: CorpusMergeTraceIdPolicy = options.dedupeTraceId ?? "off";
  mkdirSync(options.outDir, { recursive: true });
  let copiedFiles = 0;
  let skippedDuplicates = 0;
  let skippedTraceIdDuplicates = 0;
  const seenTraceIds = new Set<string>();

  for (const srcRoot of options.sources) {
    if (!existsSync(srcRoot)) {
      throw new Error(`mergeCorpusDirectories: source directory does not exist: ${srcRoot}`);
    }
    if (!statSync(srcRoot).isDirectory()) {
      throw new Error(`mergeCorpusDirectories: source is not a directory: ${srcRoot}`);
    }
    for (const day of readdirSync(srcRoot)) {
      const dayPath = join(srcRoot, day);
      if (!statSync(dayPath).isDirectory()) continue;
      for (const file of readdirSync(dayPath)) {
        if (!file.endsWith(".ndjson")) continue;
        const srcFile = join(dayPath, file);
        if (!statSync(srcFile).isFile()) continue;
        if (traceIdPolicy === "skip") {
          const traceId = readHeaderTraceId(srcFile);
          if (traceId !== null) {
            if (seenTraceIds.has(traceId)) {
              skippedTraceIdDuplicates += 1;
              continue;
            }
            seenTraceIds.add(traceId);
          }
        }
        const destDir = join(options.outDir, day);
        const destFile = join(destDir, file);
        mkdirSync(destDir, { recursive: true });
        if (existsSync(destFile)) {
          if (policy === "skip") {
            skippedDuplicates += 1;
            continue;
          }
          throw new Error(
            `mergeCorpusDirectories: duplicate trace path ${join(day, file)} (dest exists: ${destFile}); use onDuplicate: 'skip' or use a fresh outDir`,
          );
        }
        cpSync(srcFile, destFile);
        copiedFiles += 1;
      }
    }
  }

  return { copiedFiles, skippedDuplicates, skippedTraceIdDuplicates };
}
