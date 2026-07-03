import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const FETCH = resolve(ROOT, "scripts/hub-ingest/hub-gold-csharp-fetch.mjs");

test("hub gold csharp fetch: aspnet probe on csharp-literal fixture", async () => {
  const { runCsharpAspNetProbe } = await import(FETCH);
  const fixture = resolve(ROOT, "fixtures/hub-gold-csharp-literal");
  const probe = runCsharpAspNetProbe(ROOT, fixture);
  expect(probe.status).toBe(0);
  const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.ok).toBe(true);
  expect((report.results ?? []).length).toBeGreaterThan(0);
});
