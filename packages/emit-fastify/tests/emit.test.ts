import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

describe("emit-fastify: tiny-blog output", () => {
  test("emits Fastify server and schema; login uses req/reply", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-f-"));
    try {
      const mod = await ingestDirectory(FIXTURE);
      const res = await writeDomainAndEmit(mod, out);

      expect(res.handlerCount).toBe(5);
      expect(res.holes.length).toBe(0);

      const server = readFileSync(resolve(out, "src/server.ts"), "utf8");
      expect(server).toContain("Fastify");
      expect(server).toContain("export async function fetch(");
      expect(server).toContain("app.inject");
      expect(server).toContain("chrysalisDeterminismOnRequest");

      const ctx = readFileSync(resolve(out, "src/ctx.ts"), "utf8");
      expect(ctx).toContain("chrysalisNow");
      expect(ctx).toContain("chrysalisRandom");

      const login = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      expect(login).toContain("FastifyRequest");
      expect(login).toContain("queryOne<User>(");
      expect(login).toContain("getSession(req)");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

describe("emit-fastify: string-dispatch (tiny-n1)", () => {
  test("action handler emits switch", async () => {
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-emit-fn1-"));
    try {
      const mod = await ingestDirectory(FIXTURE_N1);
      await emit({ module: mod, outDir: out });
      const src = readFileSync(resolve(out, "src/handlers/action.ts"), "utf8");
      expect(src).toContain("switch (");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
