import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "export-webir-bundle.mjs");
const GOLDEN = join(ROOT, "packages", "ingest", "tests", "golden", "tiny-blog.webir.json");

test("export-webir-bundle wraps golden module in chrysalis.webir.bundle envelope", () => {
  const tmp = mkdtempSync(join(ROOT, "tmp-export-webir-"));
  const out = join(tmp, "tiny-blog.webir.bundle.json");
  execFileSync(
    process.execPath,
    [SCRIPT, "--in", GOLDEN, "--out", out],
    { encoding: "utf8", cwd: ROOT },
  );
  expect(existsSync(out)).toBe(true);
  const bundle = JSON.parse(readFileSync(out, "utf8")) as {
    format: string;
    bundleVersion: string;
    module: { nodes: unknown[]; roots: unknown[]; meta: unknown };
  };
  expect(bundle.format).toBe("chrysalis.webir.bundle");
  expect(bundle.bundleVersion).toBe("1.0.0");
  expect(bundle.module.nodes).toHaveLength(325);
  expect(bundle.module.roots).toHaveLength(5);
});

test("export-webir-bundle --help exits 0", () => {
  const out = execFileSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8", cwd: ROOT });
  expect(out).toContain("chrysalis.webir.bundle");
});
