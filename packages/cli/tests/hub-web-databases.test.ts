import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const DB = fileURLToPath(new URL("../../../scripts/hub-ingest/hub-web-databases.mjs", import.meta.url));

test("web database catalog: tier-1 coverage (G75)", async () => {
  const m = await import(DB);
  const report = m.buildWebDatabaseCatalogReport();
  expect(report.count).toBeGreaterThanOrEqual(20);
  expect(report.tier1Count).toBeGreaterThanOrEqual(11);
  expect(m.webDatabaseById("postgresql")?.sqlDialect).toBe("postgresql");
  expect(m.webDatabaseById("mongodb")?.kind).toBe("document");
  expect(m.webDatabaseById("redis")?.kind).toBe("key-value");
  const tier1 = m.listWebDatabases("tier1");
  expect(tier1.some((d) => d.id === "mysql")).toBe(true);
});
