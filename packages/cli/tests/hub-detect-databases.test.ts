import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const MOD = fileURLToPath(new URL("../../../scripts/hub-ingest/hub-detect-databases.mjs", import.meta.url));

describe("hub-detect-databases", () => {
  test("detects postgres and redis from origin scan services", async () => {
    const m = await import(MOD);
    const ids = m.detectDatabasesFromOriginServices({
      database: { via: "env:DATABASE_URL", hint: "postgresql://user:pass@db:5432/app" },
      redis: { via: "env:REDIS_URL", hint: "redis://cache:6379" },
    });
    expect(ids).toContain("postgresql");
    expect(ids).toContain("redis");
  });

  test("detects mysql from DB_HOST hints", async () => {
    const m = await import(MOD);
    const ids = m.detectDatabaseIdsFromText("mysql://root@127.0.0.1:3306/blog");
    expect(ids).toContain("mysql");
  });
});
