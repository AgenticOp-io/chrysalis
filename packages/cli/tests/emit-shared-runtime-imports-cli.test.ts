import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/tiny-blog");

describe("chrysalis emit --emit-shared-runtime-imports", () => {
  test("rejects combination with --emit-handler-import-barrel before ingest", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-sri-"));
    try {
      const r = spawnSync(
        process.execPath,
        [
          BIN,
          "emit",
          FIXTURE,
          "--out",
          out,
          "--emit-shared-runtime-imports",
          "--emit-handler-import-barrel",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(2);
      expect(r.stderr).toContain("--emit-shared-runtime-imports cannot be combined with --emit-handler-import-barrel");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emit with --emit-shared-runtime-imports writes shared module and handler imports", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-sri-ok-"));
    try {
      const r = spawnSync(
        process.execPath,
        [BIN, "emit", FIXTURE, "--out", out, "--target", "hono", "--emit-shared-runtime-imports"],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("handlers:");
      const shared = join(out, "src/chrysalis-runtime-imports.ts");
      expect(existsSync(shared)).toBe(true);
      expect(readFileSync(shared, "utf8")).toContain('from "./runtime.js"');
      const login = readFileSync(join(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("merge-all-shards emit with --emit-shared-runtime-imports writes shared module", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-merge-sri-"));
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
          "--merge-all-shards",
          "--shard-count",
          "2",
          "--emit-shared-runtime-imports",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(existsSync(join(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const login = readFileSync(join(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("emit with --emit-route-path-constants and --emit-shared-runtime-imports", () => {
    const out = mkdtempSync(join(tmpdir(), "chrysalis-emit-cli-rpc-sri-"));
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
          "--emit-route-path-constants",
          "--emit-shared-runtime-imports",
        ],
        { encoding: "utf8", cwd: ROOT },
      );
      expect(r.status).toBe(0);
      expect(existsSync(join(out, "src/chrysalis-route-paths.ts"))).toBe(true);
      expect(existsSync(join(out, "src/chrysalis-runtime-imports.ts"))).toBe(true);
      const server = readFileSync(join(out, "src/server.ts"), "utf8");
      expect(server).toContain("ChrysalisRoutePaths");
      const login = readFileSync(join(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("../chrysalis-runtime-imports.js");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
