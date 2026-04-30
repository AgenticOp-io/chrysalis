import { appendFileSync, cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/tiny-n1");

function countAstCacheJson(cacheDir: string): number {
  const ast = join(cacheDir, "ast");
  if (!existsSync(ast)) return 0;
  let n = 0;
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".json")) n += 1;
    }
  };
  walk(ast);
  return n;
}

describe("ingestDirectory ingestCacheDir", () => {
  test("reuses AST cache entries across runs; new file bytes add a cache entry", async () => {
    const base = mkdtempSync(join(tmpdir(), "chrysalis-ingest-cache-"));
    const proj = join(base, "proj");
    const cache = join(base, "cache");
    try {
      cpSync(FIXTURE, proj, { recursive: true });
      const mod1 = await ingestDirectory(proj, { ingestCacheDir: cache });
      expect(mod1.roots.length).toBe(5);
      expect(countAstCacheJson(cache)).toBe(5);

      const mod2 = await ingestDirectory(proj, { ingestCacheDir: cache });
      expect(mod2.roots.length).toBe(5);
      expect(countAstCacheJson(cache)).toBe(5);

      appendFileSync(join(proj, "pages", "dashboard.php"), "\n");
      const mod3 = await ingestDirectory(proj, { ingestCacheDir: cache });
      expect(mod3.roots.length).toBe(5);
      expect(countAstCacheJson(cache)).toBe(6);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
