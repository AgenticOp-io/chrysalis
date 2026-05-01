/**
 * Crash-resume markers for emit (V2-M2). Operators re-run **`emit --emit-resume`** after a partial **`outDir`**.
 */

import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const EMIT_RESUME_STATE_BASENAME = ".chrysalis-emit-state.json";

export interface EmitResumeStateV1 {
  readonly version: 1;
  readonly completedHandlers: readonly string[];
}

export function loadEmitResumeCompletedHandlers(outDir: string): Set<string> {
  const p = join(outDir, EMIT_RESUME_STATE_BASENAME);
  if (!existsSync(p)) return new Set();
  try {
    const j = JSON.parse(readFileSync(p, "utf8")) as EmitResumeStateV1;
    if (j?.version !== 1 || !Array.isArray(j.completedHandlers)) return new Set();
    return new Set(j.completedHandlers.map((s) => String(s)));
  } catch {
    return new Set();
  }
}

export function markEmitResumeHandlerComplete(outDir: string, handlerRelPath: string): void {
  const set = loadEmitResumeCompletedHandlers(outDir);
  set.add(handlerRelPath.replace(/\\/g, "/"));
  const data: EmitResumeStateV1 = { version: 1, completedHandlers: [...set].sort() };
  const p = join(outDir, EMIT_RESUME_STATE_BASENAME);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, p);
}

export function clearEmitResumeState(outDir: string): void {
  const p = join(outDir, EMIT_RESUME_STATE_BASENAME);
  try {
    unlinkSync(p);
  } catch {
    /* noop */
  }
}
