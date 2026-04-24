#!/usr/bin/env node
/**
 * Regenerate golden snapshot files (ingest and emit-hono tests/golden).
 * Run from repo root after intentional IR or emit output changes:
 *   pnpm run update:golden
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestDirectory } from "../packages/ingest/dist/index.js";
import { moduleToGoldenSnapshot } from "../packages/webir/dist/index.js";
import { emit } from "../packages/emit-hono/dist/index.js";
import { domainTypesByTable, emitTypes, runArchaeology } from "../packages/archaeology/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const tinyBlog = resolve(root, "fixtures/tiny-blog");
const tinyBlogSchema = resolve(tinyBlog, "schema.sql");

const webirGoldenDir = resolve(root, "packages/ingest/tests/golden");
mkdirSync(webirGoldenDir, { recursive: true });
const mod = await ingestDirectory(tinyBlog);
const webirPath = resolve(webirGoldenDir, "tiny-blog.webir.json");
writeFileSync(webirPath, moduleToGoldenSnapshot(mod), "utf8");
console.log(`[golden] wrote ${webirPath} (${mod.nodes.size} nodes)`);

const emitGoldenDir = resolve(root, "packages/emit-hono/tests/golden");
mkdirSync(emitGoldenDir, { recursive: true });
const out = resolve(root, "generated/golden-emit-tmp");
try {
  rmSync(out, { recursive: true, force: true });
} catch {
  /* noop */
}
mkdirSync(resolve(out, "src"), { recursive: true });
const schemaReport = runArchaeology({ schemaPath: tinyBlogSchema });
writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
const emitRes = await emit({
  module: mod,
  outDir: out,
  schemaReport,
  domainTypesByTable: domainTypesByTable(schemaReport),
});
const loginSrc = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
const loginGoldenPath = resolve(emitGoldenDir, "tiny-blog-login.ts");
writeFileSync(loginGoldenPath, loginSrc, "utf8");
console.log(`[golden] wrote ${loginGoldenPath} (${emitRes.holes.length} holes)`);
rmSync(out, { recursive: true, force: true });
