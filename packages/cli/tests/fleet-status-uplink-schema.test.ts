import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE = resolve(ROOT, "fixtures/ci/fleet-status-uplink-v0-smoke.json");

function assertFleetStatusUplinkV0(raw: unknown): void {
  if (typeof raw !== "object" || raw === null) throw new Error("expected object");
  const o = raw as Record<string, unknown>;
  expect(o.kind).toBe("chrysalis.fleet.status-uplink");
  expect(o.schemaVersion).toBe(0);
  expect(typeof o.collectedAt).toBe("string");
  expect(Array.isArray(o.items)).toBe(true);
  for (const it of o.items as unknown[]) {
    expect(typeof it).toBe("object");
    expect(it).not.toBeNull();
  }
}

describe("fleet status uplink fixture (V2-M6 v0)", () => {
  it("parses smoke JSON with required envelope fields", () => {
    const j = JSON.parse(readFileSync(FIXTURE, "utf8")) as unknown;
    assertFleetStatusUplinkV0(j);
  });
});
