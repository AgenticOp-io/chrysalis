import { relative, resolve } from "node:path";

/**
 * Stable `@chrysalis-provenance` path: posix slashes; relative to `provenanceRoot` when set
 * and the path is under that root.
 */
export function formatEmitProvenanceDisplay(
  provenanceRoot: string | undefined,
  originFile: string,
): string {
  if (originFile === "unknown") return "unknown";
  const norm = originFile.replace(/\\/g, "/");
  if (provenanceRoot === undefined) return norm;
  try {
    const rel = relative(resolve(provenanceRoot), resolve(originFile)).replace(/\\/g, "/");
    if (rel.startsWith("..") || rel.length === 0) return norm;
    return rel;
  } catch {
    return norm;
  }
}
