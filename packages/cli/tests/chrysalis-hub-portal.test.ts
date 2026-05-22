import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const OBSERVE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-observe-assist.mjs", import.meta.url));
const VERIFY = fileURLToPath(new URL("../../../scripts/chrysalis-hub-verify.mjs", import.meta.url));
const STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));

test("hub observe-assist: staging steps and hub traces path", async () => {
  const { buildObserveAssist } = await import(OBSERVE);
  const assist = buildObserveAssist(
    {
      id: "s1",
      name: "EU",
      localDir: "/hub/ws/p/sites/s1",
      ssh: { host: "10.0.0.1", remotePath: "/var/www/app" },
      originPrep: { suggestedTraceDir: "/var/traces", phpOnPath: true },
    },
    { id: "p", name: "P" },
    "/repo",
  );
  expect(assist.kind).toBe("chrysalis.hub.observe-assist");
  expect(assist.hubTracesDir.replace(/\\/g, "/")).toContain(".chrysalis/traces");
  expect(assist.stagingSteps.length).toBeGreaterThan(3);
  expect(assist.commands.phpBuiltIn).toContain("auto_prepend_file");
});

test("hub verify: defaultTracesDir under site workspace", async () => {
  const { defaultTracesDir } = await import(VERIFY);
  expect(defaultTracesDir("/tmp/site")).toMatch(/\.chrysalis[\\/]traces$/);
});

test("hub store: updateProjectSite patches ssh and name", async () => {
  const prev = process.env.CHRYSALIS_HUB_ROOT;
  const root = await mkdtemp(join(tmpdir(), "chrysalis-hub-test-"));
  process.env.CHRYSALIS_HUB_ROOT = root;
  try {
    const { createHubProject, updateProjectSite, getProject } = await import(STORE);
    const p = await createHubProject({
      name: "Portal Test",
      runSetup: false,
      backgroundSetup: false,
      sites: [
        {
          name: "A",
          ssh: { host: "h1", user: "u", port: 22, remotePath: "/app" },
          pullFromSsh: false,
          prepOrigin: false,
          backgroundSetup: false,
        },
      ],
    });
    const siteId = p.sites[0].id;
    await updateProjectSite(p.id, siteId, { name: "Renamed", ssh: { host: "h2" } });
    const fresh = await getProject(p.id);
    expect(fresh?.sites[0].name).toBe("Renamed");
    expect(fresh?.sites[0].ssh.host).toBe("h2");
  } finally {
    process.env.CHRYSALIS_HUB_ROOT = prev;
    await rm(root, { recursive: true, force: true });
  }
});
