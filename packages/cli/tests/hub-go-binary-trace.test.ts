import { copyFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE = resolve(ROOT, "fixtures/hub-flagship-go");
const HAS_GO = spawnSync("go", ["version"], { encoding: "utf8" }).status === 0;

// fixtures/hub-flagship-go has only registerRoutes; the test supplies main + go.mod to get a binary.
const WRAPPER = `package main

import (
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	registerRoutes(r)
	_ = r.Run("127.0.0.1:" + os.Getenv("PORT"))
}
`;

test.skipIf(!HAS_GO)(
  "go-binary-trace records traces for hub-flagship-go GET routes (D6601)",
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "chrysalis-go-binary-"));
    await copyFile(join(FIXTURE, "main.go"), join(dir, "main.go"));
    await writeFile(join(dir, "server.go"), WRAPPER, "utf8");
    await writeFile(join(dir, "go.mod"), "module hubflagshipgo\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.10.0\n");
    const goEnv = { ...process.env, GOFLAGS: "-mod=mod" };
    const tidy = spawnSync("go", ["mod", "tidy"], { cwd: dir, encoding: "utf8", env: goEnv });
    expect(tidy.status, tidy.stderr).toBe(0);
    const bin = join(dir, process.platform === "win32" ? "server.exe" : "server");
    const build = spawnSync("go", ["build", "-o", bin, "."], { cwd: dir, encoding: "utf8", env: goEnv });
    expect(build.status, build.stderr).toBe(0);

    const { parseGoRoutes } = await import(resolve(ROOT, "scripts/hub-ingest/go-ast-ingest.mjs"));
    const routes = parseGoRoutes(await readFile(join(FIXTURE, "main.go"), "utf8")).map(
      (r: Record<string, unknown>) => ({ ...r, holes: ["legacy:go-binary-handler-body"] }),
    );
    const samples = join(dir, "samples");
    await mkdir(samples);
    await writeFile(join(samples, "GET_items_id.json"), JSON.stringify({ path: "/items/7" }));

    const { traceGoBinary } = await import(resolve(ROOT, "scripts/hub-ingest/go-binary-trace.mjs"));
    const out = await traceGoBinary({ binary: bin, routes, samplesDir: samples });
    const byKey = new Map(out.routes.map((r: any) => [`${r.method} ${r.path}`, r]));

    for (const r of routes.filter((x: any) => x.method === "GET" && !/[:*{]/.test(x.path))) {
      const got: any = byKey.get(`${r.method} ${r.path}`);
      expect(got.observed, `${r.method} ${r.path}`).toBeDefined();
      expect(got.holes).toEqual(["legacy:go-binary-handler-body"]);
      expect(got.observed.evidenceFor).toBe("legacy:go-binary-handler-body");
    }
    expect((byKey.get("GET /meta") as any).observed.bodyShape).toEqual({
      object: { service: "string", version: "number" },
    });
    expect((byKey.get("GET /items/:id") as any).observed.bodyShape).toEqual({ object: { id: "string" } });
    expect((byKey.get("POST /items") as any).observed.status).toBe(201);
    // No sample for /users/:userId -> not guessed.
    expect((byKey.get("GET /users/:userId") as any).observed).toBeUndefined();
    expect(out.trace.skipped.map((s: any) => s.path)).toContain("/users/:userId");
  },
  120_000,
);
