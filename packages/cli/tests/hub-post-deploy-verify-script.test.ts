import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const script = fileURLToPath(new URL("../../../scripts/hub-post-deploy-verify.mjs", import.meta.url));

test("hub-post-deploy-verify script exists", async () => {
  await access(script);
});

test("hub-post-deploy-verify passes artifact checks in strict-off mode", async () => {
  const { spawnSync } = await import("node:child_process");
  const root = fileURLToPath(new URL("../../..", import.meta.url));
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    env: {
      ...process.env,
      CHRYSALIS_DEPLOY_STRICT: "0",
      CHRYSALIS_SKIP_HUB_HTTP_PROBE: "1",
      CHRYSALIS_SKIP_WPTP_HUB_DEPS: process.env.CHRYSALIS_SKIP_WPTP_HUB_DEPS ?? "1",
    },
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const j = JSON.parse(r.stdout.trim());
  expect(j.kind).toBe("chrysalis.hub.deploy-verify");
  expect(j.checks?.some((c: { name: string }) => c.name === "cli-bin")).toBe(true);
});
