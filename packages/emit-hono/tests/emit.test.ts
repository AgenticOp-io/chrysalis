import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { ingestDirectory } from "@chrysalis/ingest";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");

describe("emit-hono: tiny-blog output", () => {
  test("emits all expected files and zero holes", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const res = await emit({ module: mod, outDir: out });

      expect(res.handlerCount).toBe(5);
      expect(res.holes.length).toBe(0);

      const expectedFiles = [
        "package.json",
        "tsconfig.json",
        "src/db.ts",
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
      await emit({ module: mod, outDir: out });
      const src = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(src).toContain("queryOne(");
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
      await emit({ module: mod, outDir: out });
      const src = readFileSync(resolve(out, "src/handlers/posts_view.ts"), "utf8");
      expect(src).toMatch(/@chrysalis-effects.*db\.read:posts/);
      expect(src).toMatch(/@chrysalis-effects.*db\.read:comments/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
