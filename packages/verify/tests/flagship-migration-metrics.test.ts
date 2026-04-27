import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const metricsHref = pathToFileURL(join(repoRoot, "scripts/flagship-migration-metrics.mjs")).href;

async function loadMetrics() {
  return import(metricsHref) as Promise<typeof import("../../../scripts/flagship-migration-metrics.mjs")>;
}

describe("flagship-migration-metrics.mjs", () => {
  let m: Awaited<ReturnType<typeof loadMetrics>>;
  beforeAll(async () => {
    m = await loadMetrics();
  });

  it("idiomaticityPctFromScans uses conservative min across emitters", () => {
    const hono = { totalTsFiles: 2, filesWithCompatImport: 1 };
    const fast = { totalTsFiles: 2, filesWithCompatImport: 0 };
    expect(m.idiomaticityPctFromScans(hono, fast)).toBeCloseTo(0.5, 5);
  });

  it("idiomaticityPctFromScans returns 1 when no compat imports", () => {
    const a = { totalTsFiles: 3, filesWithCompatImport: 0 };
    const b = { totalTsFiles: 3, filesWithCompatImport: 0 };
    expect(m.idiomaticityPctFromScans(a, b)).toBe(1);
  });

  it("countAuthTaggedHoles sums reasons prefixed with auth:", () => {
    expect(m.countAuthTaggedHoles(undefined)).toBe(0);
    expect(
      m.countAuthTaggedHoles([
        { reason: "auth:unresolved call: Gate::check" },
        { reason: "unresolved call: other" },
      ]),
    ).toBe(1);
  });

  it("authLegacyRequestPctFromEmitStats mirrors hole density for auth-tagged holes", () => {
    expect(m.authLegacyRequestPctFromEmitStats(4, 1)).toBeCloseTo(25, 5);
    expect(m.authLegacyRequestPctFromEmitStats(10, 0)).toBe(0);
    expect(m.authLegacyRequestPctFromEmitStats(0, 2)).toBe(null);
  });

  it("residualLegacyRequestPctFromEmitStats caps at 100", () => {
    expect(
      m.residualLegacyRequestPctFromEmitStats({
        manifestRoutes: 10,
        hono: { holes: 50 },
        fastify: { holes: 0 },
      }),
    ).toBe(100);
    expect(
      m.residualLegacyRequestPctFromEmitStats({
        manifestRoutes: 50,
        hono: { holes: 0 },
        fastify: { holes: 0 },
      }),
    ).toBe(0);
  });

  it("writeFlagshipLaravelFullMigrationSidecars writes idiomaticity + residual", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-mig-sidecar-"));
    try {
      const migrationDir = join(dir, "reports/migration");
      mkdirSync(migrationDir, { recursive: true });
      writeFileSync(
        join(migrationDir, "flagship-laravel-full-emit-stats.json"),
        `${JSON.stringify(
          {
            schema: "chrysalis/flagship-laravel-full-emit-stats/1",
            manifestRoutes: 4,
            hono: { holes: 1, authHoles: 1, handlerCount: 4 },
            fastify: { holes: 0, authHoles: 0, handlerCount: 4 },
          },
          null,
          2,
        )}\n`,
      );
      const honoHandlers = join(dir, "generated/flagship-laravel-full/src/handlers");
      mkdirSync(honoHandlers, { recursive: true });
      writeFileSync(join(honoHandlers, "a.ts"), `import { count } from "@chrysalis/compat";\nexport const x = count([]);\n`);
      writeFileSync(join(honoHandlers, "b.ts"), `export const plain = 2;\n`);
      const fastHandlers = join(dir, "generated/flagship-laravel-full-fastify/src/handlers");
      mkdirSync(fastHandlers, { recursive: true });
      writeFileSync(join(fastHandlers, "a.ts"), `export const y = 1;\n`);

      m.writeFlagshipLaravelFullMigrationSidecars(dir);

      const idio = JSON.parse(readFileSync(join(migrationDir, "idiomaticity.json"), "utf8"));
      expect(idio.pct).toBeCloseTo(0.5, 5);
      expect(idio.pilot).toBe("laravel-full");
      const res = JSON.parse(readFileSync(join(migrationDir, "residual-legacy.json"), "utf8"));
      expect(res.legacyRequestPct).toBeCloseTo(25, 5);
      expect(res.authLegacyRequestPct).toBeCloseTo(25, 5);
      expect(res.authEmitHoleMax).toBe(1);
      expect(res.authDefinition).toBe("emit-auth-hole-density-vs-manifest-routes");
      expect(res.definition).toBe("emit-hole-density-vs-manifest-routes");
      expect(res.pilot).toBe("laravel-full");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writeFlagshipLaravelMinMigrationSidecars uses min emit paths + pilot", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-mig-sidecar-min-"));
    try {
      const migrationDir = join(dir, "reports/migration");
      mkdirSync(migrationDir, { recursive: true });
      writeFileSync(
        join(migrationDir, "flagship-laravel-min-emit-stats.json"),
        `${JSON.stringify(
          {
            schema: "chrysalis/flagship-laravel-min-emit-stats/1",
            manifestRoutes: 2,
            hono: { holes: 0, authHoles: 0, handlerCount: 2 },
            fastify: { holes: 0, authHoles: 0, handlerCount: 2 },
          },
          null,
          2,
        )}\n`,
      );
      const honoHandlers = join(dir, "generated/flagship-laravel-min/src/handlers");
      mkdirSync(honoHandlers, { recursive: true });
      writeFileSync(join(honoHandlers, "x.ts"), `export const x = 1;\n`);
      const fastHandlers = join(dir, "generated/flagship-laravel-min-fastify/src/handlers");
      mkdirSync(fastHandlers, { recursive: true });
      writeFileSync(join(fastHandlers, "y.ts"), `export const y = 2;\n`);

      m.writeFlagshipLaravelMinMigrationSidecars(dir);

      const idio = JSON.parse(readFileSync(join(migrationDir, "idiomaticity.json"), "utf8"));
      expect(idio.pct).toBe(1);
      expect(idio.pilot).toBe("laravel-min");
      const res = JSON.parse(readFileSync(join(migrationDir, "residual-legacy.json"), "utf8"));
      expect(res.legacyRequestPct).toBe(0);
      expect(res.authLegacyRequestPct).toBe(0);
      expect(res.authEmitHoleMax).toBe(0);
      expect(res.pilot).toBe("laravel-min");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
