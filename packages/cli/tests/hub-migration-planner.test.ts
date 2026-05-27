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
