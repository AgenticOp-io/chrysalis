import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CI_GATES = resolve(ROOT, "scripts/ci-gates.mjs");

describe("ci-gates hub knowledge exports", () => {
  test("accepts path-knowledge artifact when present", () => {
    const p = resolve(ROOT, "reports/ci/hub-path-knowledge.json");
    if (!existsSync(p)) {
      expect(true).toBe(true);
      return;
    }
    const r = spawnSync(process.execPath, [CI_GATES, "hub-path-knowledge", p], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  test("accepts web-databases artifact when present", () => {
    const p = resolve(ROOT, "reports/ci/hub-web-databases.json");
    if (!existsSync(p)) {
      expect(true).toBe(true);
      return;
    }
    const r = spawnSync(process.execPath, [CI_GATES, "hub-web-databases", p], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
