/**
 * Post-emit filesystem metrics for generated TypeScript (V2-M4 layout observability).
 * Walks emitted project roots; skips common non-source trees.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "chrysalis-sessions",
  "dist",
  "coverage",
]);

/** Line and file counts for `.ts` files under an emitted app root. */
export interface EmittedTsLayout {
  readonly tsFileCount: number;
  readonly tsLineCount: number;
  /** Relative to `outDirAbsolute`, posix-style. Null when no `.ts` files. */
  readonly largestFileRelativePath: string | null;
  readonly largestFileLineCount: number;
}

/**
 * Summarize `.ts` layout under an emitted project directory (e.g. `generated/tiny-blog`).
 * Skips `node_modules`, `.git`, `chrysalis-sessions`, `dist`, `coverage`.
 */
export function summarizeEmittedTypeScriptLayout(outDirAbsolute: string): EmittedTsLayout {
  let tsFileCount = 0;
  let tsLineCount = 0;
  let largestFileRelativePath: string | null = null;
  let largestFileLineCount = 0;

  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIR_NAMES.has(ent.name)) continue;
        walk(p);
        continue;
      }
      if (!ent.isFile() || !ent.name.endsWith(".ts")) continue;
      const rel = relative(outDirAbsolute, p).replace(/\\/g, "/");
      let text: string;
      try {
        text = readFileSync(p, "utf8");
      } catch {
        continue;
      }
      const lines = text.split(/\r?\n/).length;
      tsFileCount += 1;
      tsLineCount += lines;
      const better =
        lines > largestFileLineCount ||
        (lines === largestFileLineCount &&
          (largestFileRelativePath === null || rel.localeCompare(largestFileRelativePath) < 0));
      if (better) {
        largestFileLineCount = lines;
        largestFileRelativePath = rel;
      }
    }
  };

  try {
    if (!statSync(outDirAbsolute).isDirectory()) {
      return {
        tsFileCount: 0,
        tsLineCount: 0,
        largestFileRelativePath: null,
        largestFileLineCount: 0,
      };
    }
  } catch {
    return {
      tsFileCount: 0,
      tsLineCount: 0,
      largestFileRelativePath: null,
      largestFileLineCount: 0,
    };
  }

  walk(outDirAbsolute);
  return {
    tsFileCount,
    tsLineCount,
    largestFileRelativePath,
    largestFileLineCount,
  };
}
