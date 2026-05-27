import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const PLANNER = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-migration-planner.mjs", import.meta.url),
);

test("migration planner: compare + database context (G78)", async () => {
  const { buildMigrationPlan } = await import(PLANNER);
  const plan = buildMigrationPlan({
    origin: "php",
    outputs: ["hono", "fastify", "typescript"],
    detectedDatabases: ["postgresql", "redis"],
  });
  expect(plan.recommendedOutput).toBeTruthy();
  expect(plan.databases.detected.length).toBe(2);
  expect(plan.steps.length).toBeGreaterThanOrEqual(4);
});

test("migration planner: merges origin scan services (G83)", async () => {
  const { buildMigrationPlan } = await import(PLANNER);
  const plan = buildMigrationPlan({
    origin: "php",
    outputs: ["hono"],
    originServices: {
      database: { hint: "mysql://localhost/app" },
      redis: { hint: "redis://127.0.0.1" },
    },
  });
  expect(plan.detectedDatabaseIds).toEqual(expect.arrayContaining(["mysql", "redis"]));
});
