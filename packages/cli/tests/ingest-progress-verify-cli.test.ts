import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const BIN = resolve(ROOT, "packages/cli/dist/bin.js");

describe("verify --ingest-progress-file", () => {
  test("requires --project before reading corpus", () => {
    const progressPath = join(tmpdir(), "chrysalis-ingest-progress-no-project.json");
    const r = spawnSync(
      process.execPath,
      [
        BIN,
        "verify",
        join(tmpdir(), "chrysalis-nonexistent-traces-xx"),
        "--base-url",
        "http://127.0.0.1:1",
        "--ingest-progress-file",
        progressPath,
      ],
      { encoding: "utf8", cwd: ROOT },
    );
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--ingest-progress-file requires --project");
  });
});
