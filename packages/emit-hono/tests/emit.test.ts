import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const FIXTURE_SCHEMA = resolve(__dirname, "../../../fixtures/tiny-blog/schema.sql");
const FIXTURE_N1 = resolve(__dirname, "../../../fixtures/tiny-n1");

function writeDomainAndEmit(mod: Awaited<ReturnType<typeof ingestDirectory>>, outDir: string) {
  const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
  mkdirSync(resolve(outDir, "src"), { recursive: true });
  writeFileSync(resolve(outDir, "src/domain.ts"), emitTypes(schemaReport));
  return emit({
    module: mod,
    outDir,
    schemaReport,
    domainTypesByTable: domainTypesByTable(schemaReport),
  });
}

describe("emit-hono: tiny-blog output", () => {
  test("emits all expected files and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const res = await writeDomainAndEmit(mod, out);

      expect(res.handlerCount).toBe(5);
      expect(res.holes.length).toBe(0);

      expect(existsSync(resolve(out, "src/domain.ts"))).toBe(true);

      const expectedFiles = [
        "package.json",
        "tsconfig.json",
        "src/db.ts",
        "src/schema.ts",
        "src/session.ts",
        "src/runtime.ts",
        "src/server.ts",
        "src/index.ts",
        "src/handlers/posts_list.ts",
        "src/handlers/posts_view.ts",
        "src/handlers/login.ts",
        "src/handlers/posts_create.ts",
        "src/handlers/comments_create.ts",
        "chrysalis.holes.json",
      ];
      const emitted = new Set(res.files.map((f) => f.path.replace(/\\/g, "/")));
      for (const f of expectedFiles) expect(emitted.has(f)).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("login handler contains session.write and queryOne", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await writeDomainAndEmit(mod, out);
      const src = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(src).toContain("queryOne<User>(");
      expect(src).toContain('import type { User } from "../domain.js"');
      expect(src).toContain(`getSession(c).set("user_id"`);
      expect(src).toContain("await passwordVerify(");
      // Must not fall back to a call hole for the wrapper function.
      expect(src).not.toContain("call:verify_password");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("posts_view handler carries @chrysalis-effects annotation", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      await writeDomainAndEmit(mod, out);
      const src = readFileSync(resolve(out, "src/handlers/posts_view.ts"), "utf8");
      expect(src).toMatch(/@chrysalis-effects.*db\.read:posts/);
      expect(src).toMatch(/@chrysalis-effects.*db\.read:comments/);
      expect(src).toMatch(/@chrysalis-effects.*session\.read/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-hono: string-dispatch switch (tiny-n1 /action)", () => {
  test("action handler emits switch on POST op", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out });
      const src = readFileSync(resolve(out, "src/handlers/action.ts"), "utf8");
      expect(src).toContain("switch (");
      expect(src).toMatch(/case ['"]create['"]/);
      expect(src).toMatch(/case ['"]update['"]/);
      expect(src).toMatch(/case ['"]delete['"]/);
      expect(src).toMatch(/case ['"]archive['"]/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
