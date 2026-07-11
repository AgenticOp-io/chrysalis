import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");
const FIXTURE = resolve(ROOT, "fixtures/site-scale-matrix");

const workDir = mkdtempSync(join(tmpdir(), "chrysalis-convert-site-"));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

describe("chrysalis convert-site", () => {
  test("writes site-convert.json on the site-scale-matrix fixture (D6366)", () => {
    cpSync(FIXTURE, workDir, { recursive: true });
    const r = spawnSync(
      process.execPath,
      [BIN, "convert-site", workDir, "--json"],
      { encoding: "utf8", cwd: ROOT, maxBuffer: 8 * 1024 * 1024 },
    );
    expect(r.status, r.stderr || r.stdout).toBe(0);
    const summary = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(summary.ok).toBe(true);
    expect(typeof summary.reportPath).toBe("string");
    expect(existsSync(summary.reportPath as string)).toBe(true);
    const report = JSON.parse(readFileSync(summary.reportPath as string, "utf8")) as {
      kind: string;
      ok: boolean;
    };
    expect(report.kind).toBe("chrysalis.site-convert.v1");
    expect(report.ok).toBe(true);
  });
});
