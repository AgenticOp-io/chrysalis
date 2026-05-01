import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCRIPT = resolve(ROOT, "scripts/export-fleet-status-uplink.mjs");

describe("export-fleet-status-uplink.mjs", () => {
  it("wraps payload JSON in uplink envelope", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-fleet-export-"));
    try {
      const payloadPath = join(dir, "payload.json");
      writeFileSync(payloadPath, JSON.stringify({ foo: 1, bar: "x" }), "utf8");
      const r = spawnSync(process.execPath, [SCRIPT, "--payload-json", payloadPath, "--project-label", "p1"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(r.status).toBe(0);
      const j = JSON.parse(r.stdout) as Record<string, unknown>;
      expect(j.kind).toBe("chrysalis.fleet.status-uplink");
      expect(j.schemaVersion).toBe(0);
      expect(typeof j.collectedAt).toBe("string");
      expect(Array.isArray(j.items)).toBe(true);
      const row = j.items![0] as Record<string, unknown>;
      expect(row.projectLabel).toBe("p1");
      expect(row.status).toEqual({ foo: 1, bar: "x" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
