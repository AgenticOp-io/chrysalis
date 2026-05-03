import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/dedupe-identical-handlers");

describe("chrysalis emit --emit-dedupe-identical-handler-bodies", () => {
  test("hono: subprocess emit writes one chrysalis-deduped module and thin handlers", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-dedupe-hono-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--target",
          "hono",
          "--emit-dedupe-identical-handler-bodies",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("handlers:");
      const dedupeDir = join(out, "src/chrysalis-deduped");
      expect(existsSync(dedupeDir)).toBe(true);
      expect(readdirSync(dedupeDir).length).toBe(1);
      const aSrc = readFileSync(join(out, "src/handlers/twin_a.ts"), "utf8");
      const bSrc = readFileSync(join(out, "src/handlers/twin_b.ts"), "utf8");
      const idA = aSrc.match(/chrysalisBodyDedupe_[0-9a-f]+/)?.[0];
      expect(idA).toBeDefined();
      expect(bSrc).toContain(idA!);
      expect(aSrc).toContain(`return ${idA}(c);`);
      expect(bSrc).toContain(`return ${idA}(c);`);
      expect(aSrc).not.toContain("__hole(");
      expect(bSrc).not.toContain("__hole(");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("fastify: subprocess emit writes one chrysalis-deduped module and thin handlers", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-dedupe-fastify-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--target",
          "fastify",
          "--emit-dedupe-identical-handler-bodies",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      const dedupeDir = join(out, "src/chrysalis-deduped");
      expect(existsSync(dedupeDir)).toBe(true);
      expect(readdirSync(dedupeDir).length).toBe(1);
      const aSrc = readFileSync(join(out, "src/handlers/twin_a.ts"), "utf8");
      const bSrc = readFileSync(join(out, "src/handlers/twin_b.ts"), "utf8");
      const idA = aSrc.match(/chrysalisBodyDedupe_[0-9a-f]+/)?.[0];
      expect(idA).toBeDefined();
      expect(aSrc).toContain(`return ${idA}(req, reply);`);
      expect(bSrc).toContain(`return ${idA}(req, reply);`);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("hono: dedupe with --emit-route-path-constants writes route paths + one deduped module", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-dedupe-rpc-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--target",
          "hono",
          "--emit-dedupe-identical-handler-bodies",
          "--emit-route-path-constants",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(existsSync(join(out, "src/chrysalis-route-paths.ts"))).toBe(true);
      expect(readdirSync(join(out, "src/chrysalis-deduped")).length).toBe(1);
      const server = readFileSync(join(out, "src/server.ts"), "utf8");
      expect(server).toContain("ChrysalisRoutePaths");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("hono: dedupe with --emit-shared-runtime-imports wires SRI for thin handlers and deduped body", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-dedupe-sri-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--target",
          "hono",
          "--emit-dedupe-identical-handler-bodies",
          "--emit-shared-runtime-imports",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(existsSync(join(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      expect(readdirSync(join(out, "src/chrysalis-deduped")).length).toBe(1);
      const aSrc = readFileSync(join(out, "src/handlers/twin_a.ts"), "utf8");
      expect(aSrc).toContain("../chrysalis-runtime-imports.js");
      const id = aSrc.match(/chrysalisBodyDedupe_[0-9a-f]+/)?.[0];
      expect(id).toBeDefined();
      const deduped = readFileSync(join(out, "src/chrysalis-deduped", `${id}.ts`), "utf8");
      expect(deduped).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
