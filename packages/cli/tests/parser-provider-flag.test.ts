import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CLI_SRC = resolve(ROOT, "packages/cli/src/bin.ts");

function runCli(args: readonly string[], env?: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ["--import", "tsx", CLI_SRC, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe("cli parser provider validation", () => {
  test("rejects unsupported --parser-provider value", () => {
    const r = runCli(["ingest", "fixtures/tiny-blog", "--parser-provider", "bad-provider"]);
    expect((r.status ?? 0) !== 0).toBe(true);
    expect(r.stderr).toContain("unsupported --parser-provider");
  });

  test("rejects unsupported CHRYSALIS_PARSER_PROVIDER env value", () => {
    const r = runCli(["ingest", "fixtures/tiny-blog"], {
      CHRYSALIS_PARSER_PROVIDER: "bad-provider",
    });
    expect((r.status ?? 0) !== 0).toBe(true);
    expect(r.stderr).toContain("unsupported CHRYSALIS_PARSER_PROVIDER");
  });
});

