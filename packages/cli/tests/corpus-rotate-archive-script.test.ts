import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "corpus-rotate-archive.mjs");

test("corpus-rotate-archive moves old YYYY-MM-DD buckets", () => {
  const tmp = mkdtempSync(join(ROOT, "tmp-corpus-rotate-"));
  const traces = join(tmp, "traces");
  const archive = join(tmp, "archive");
  mkdirSync(join(traces, "2020-01-01"), { recursive: true });
  writeFileSync(join(traces, "2020-01-01", "x.ndjson"), "{}\n", "utf8");
  mkdirSync(join(traces, "2099-12-01"), { recursive: true });
  writeFileSync(join(traces, "2099-12-01", "y.ndjson"), "{}\n", "utf8");
  const oldDir = join(traces, "2020-01-01");
  const t = Date.now() - 400 * 24 * 60 * 60 * 1000;
  utimesSync(oldDir, t / 1000, t / 1000);

  execFileSync(process.execPath, [SCRIPT, "--traces-root", traces, "--archive-root", archive, "--older-than-days", "30"], {
    encoding: "utf8",
    cwd: ROOT,
  });

  expect(existsSync(join(archive, "2020-01-01", "x.ndjson"))).toBe(true);
  expect(existsSync(join(traces, "2099-12-01", "y.ndjson"))).toBe(true);
});

test("corpus-rotate-archive --dry-run does not move", () => {
  const tmp = mkdtempSync(join(ROOT, "tmp-corpus-rotate-dry-"));
  const traces = join(tmp, "traces");
  mkdirSync(join(traces, "2020-06-01"), { recursive: true });
  writeFileSync(join(traces, "2020-06-01", "z.ndjson"), "{}\n", "utf8");
  const oldDir = join(traces, "2020-06-01");
  const t = Date.now() - 400 * 24 * 60 * 60 * 1000;
  utimesSync(oldDir, t / 1000, t / 1000);

  const out = execFileSync(
    process.execPath,
    [SCRIPT, "--traces-root", traces, "--archive-root", join(tmp, "archive"), "--older-than-days", "30", "--dry-run"],
    { encoding: "utf8", cwd: ROOT },
  );
  expect(out).toContain("dry-run");
  expect(existsSync(join(traces, "2020-06-01", "z.ndjson"))).toBe(true);
});
