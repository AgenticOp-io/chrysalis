import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const ciGates = join(repoRoot, "scripts", "ci-gates.mjs");

function runGate(env: Record<string, string | undefined>): string {
  return execFileSync(process.execPath, [ciGates, "session-bridge-release"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runGateExpectFail(env: Record<string, string | undefined>): string {
  try {
    runGate(env);
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string | Buffer; stdout?: string | Buffer };
    expect(e.status).toBe(1);
    const stderr = typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString("utf8") ?? "");
    const stdout = typeof e.stdout === "string" ? e.stdout : (e.stdout?.toString("utf8") ?? "");
    return `${stderr}${stdout}`;
  }
  throw new Error("expected session-bridge-release to fail");
}

describe("ci-gates session-bridge-release", () => {
  it("passes multi-host when redis is configured", () => {
    const out = runGate({
      CHRYSALIS_DEPLOY_TOPOLOGY: "multi-host",
      CHRYSALIS_SESSION_BRIDGE_MODE: "redis",
      CHRYSALIS_SESSION_REDIS_URL: "redis://127.0.0.1:6379/0",
    });
    expect(out).toContain("session-bridge-release OK");
  });

  it("fails multi-host when bridge mode is not redis", () => {
    const out = runGateExpectFail({
      CHRYSALIS_DEPLOY_TOPOLOGY: "multi-host",
      CHRYSALIS_SESSION_BRIDGE_MODE: "sqlite",
      CHRYSALIS_SESSION_SQLITE_PATH: "sessions.sqlite",
    });
    expect(out).toContain("multi-host topology requires");
  });

  it("fails redis mode when url is missing", () => {
    const out = runGateExpectFail({
      CHRYSALIS_DEPLOY_TOPOLOGY: "multi-host",
      CHRYSALIS_SESSION_BRIDGE_MODE: "redis",
      CHRYSALIS_SESSION_REDIS_URL: "",
    });
    expect(out).toContain("CHRYSALIS_SESSION_REDIS_URL must be set");
  });

  it("passes single-host sqlite mode with sqlite path", () => {
    const out = runGate({
      CHRYSALIS_DEPLOY_TOPOLOGY: "single-host",
      CHRYSALIS_SESSION_BRIDGE_MODE: "sqlite",
      CHRYSALIS_SESSION_SQLITE_PATH: "sessions.sqlite",
    });
    expect(out).toContain("session-bridge-release OK");
  });

  it("blocks memory mode unless explicitly allowed", () => {
    const out = runGateExpectFail({
      CHRYSALIS_DEPLOY_TOPOLOGY: "single-host",
      CHRYSALIS_SESSION_BRIDGE_MODE: "memory",
      CHRYSALIS_ALLOW_MEMORY_SESSION_RELEASE: "0",
    });
    expect(out).toContain("memory mode blocked");
  });
});
