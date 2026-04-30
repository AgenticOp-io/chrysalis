/**
 * Optional on-disk cache for PHP AST JSON between runs (V2-M2 incremental ingest).
 * Bump {@link INGEST_AST_CACHE_VERSION} when ingest lowering changes without parser output changing.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseFile, type PhpAst, type Provider } from "@chrysalis/parser-bridge";

/** Increment when cached AST is no longer sufficient for current ingest passes. */
export const INGEST_AST_CACHE_VERSION = "1";

export interface CachedPhpAstPayload {
  readonly ingestCacheVersion: string;
  readonly parserProvider: Provider;
  readonly sourceSha256: string;
  readonly ast: PhpAst;
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function cacheEntryPath(cacheDir: string, sourceSha256: string, parserProvider: Provider): string {
  const sub = sourceSha256.slice(0, 2);
  return join(cacheDir, "ast", sub, `${sourceSha256}-${parserProvider}.json`);
}

/**
 * Read PHP from disk, return AST from cache when valid, otherwise parse and write cache.
 */
export async function loadOrParsePhpAstWithCache(
  absolutePhpPath: string,
  parserProvider: Provider,
  cacheDir: string,
): Promise<PhpAst> {
  const buf = readFileSync(absolutePhpPath);
  const sourceSha256 = sha256Hex(buf);
  const entryPath = cacheEntryPath(cacheDir, sourceSha256, parserProvider);
  if (existsSync(entryPath)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(entryPath, "utf8")) as unknown;
    } catch {
      raw = null;
    }
    if (raw && typeof raw === "object" && raw !== null) {
      const e = raw as Partial<CachedPhpAstPayload>;
      if (
        e.ingestCacheVersion === INGEST_AST_CACHE_VERSION &&
        e.parserProvider === parserProvider &&
        e.sourceSha256 === sourceSha256 &&
        e.ast &&
        typeof e.ast === "object" &&
        typeof (e.ast as PhpAst).schemaVersion === "string"
      ) {
        return e.ast as PhpAst;
      }
    }
  }
  const ast = await parseFile(absolutePhpPath, { provider: parserProvider });
  mkdirSync(dirname(entryPath), { recursive: true });
  const payload: CachedPhpAstPayload = {
    ingestCacheVersion: INGEST_AST_CACHE_VERSION,
    parserProvider,
    sourceSha256,
    ast,
  };
  writeFileSync(entryPath, JSON.stringify(payload), "utf8");
  return ast;
}
