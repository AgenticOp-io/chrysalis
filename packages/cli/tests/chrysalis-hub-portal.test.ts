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

test("hub tenancy: tenant actor isolation", async () => {
  const { hubActorFromRequest, canAccessProject, ownerForNewProject } = await import(STORE);
  const admin = hubActorFromRequest({ headers: { authorization: "Bearer secret" } }, "secret");
  const tenant = hubActorFromRequest({ headers: { authorization: "Bearer user-a" } }, "secret");
  expect(admin.role).toBe("admin");
  expect(tenant.role).toBe("tenant");
  expect(await canAccessProject({ owner: "abc" }, tenant)).toBe(false);
  expect(await canAccessProject({ owner: "abc" }, admin)).toBe(true);
  expect(ownerForNewProject(tenant)).toHaveLength(24);
});

test("hub traces upload: parseMultipartFiles", async () => {
  const { parseMultipartFiles } = await import(
    fileURLToPath(new URL("../../../scripts/chrysalis-hub-traces-upload.mjs", import.meta.url))
  );
  const boundary = "----boundary";
  const body = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="traces"; filename="t.ndjson"\r\n\r\n{"x":1}\r\n--${boundary}--\r\n`,
  );
  const files = parseMultipartFiles(body, `multipart/form-data; boundary=${boundary}`);
  expect(files).toHaveLength(1);
  expect(files[0].filename).toBe("t.ndjson");
});

test("hub org: create and org-scoped project access", async () => {
  const prev = process.env.CHRYSALIS_HUB_ROOT;
  const root = await mkdtemp(join(tmpdir(), "chrysalis-hub-org-"));
  process.env.CHRYSALIS_HUB_ROOT = root;
  const ORG = fileURLToPath(new URL("../../../scripts/chrysalis-hub-org.mjs", import.meta.url));
  const STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));
  try {
    const { createOrg, joinOrg } = await import(ORG);
    const { createHubProject, canAccessProject, hubActorFromRequest } = await import(STORE);
    const org = await createOrg({ name: "Team A", actorId: "alice" });
    await joinOrg(org.id, "bob");
    const p = await createHubProject({
      name: "Org project",
      orgId: org.id,
      owner: "alice",
      runSetup: false,
      backgroundSetup: false,
      sites: [],
    });
    const alice = hubActorFromRequest({ headers: { authorization: "Bearer x" } }, "secret");
    alice.id = "alice";
    alice.role = "tenant";
    const bob = { ...alice, id: "bob" };
    const eve = { ...alice, id: "eve" };
    expect(await canAccessProject(p, alice)).toBe(true);
    expect(await canAccessProject(p, bob)).toBe(true);
    expect(await canAccessProject(p, eve)).toBe(false);
  } finally {
    process.env.CHRYSALIS_HUB_ROOT = prev;
    await rm(root, { recursive: true, force: true });
  }
});

test("hub traces: resumable upload round-trip", async () => {
  const prev = process.env.CHRYSALIS_HUB_ROOT;
  const root = await mkdtemp(join(tmpdir(), "chrysalis-hub-upload-"));
  process.env.CHRYSALIS_HUB_ROOT = root;
  const UP = fileURLToPath(new URL("../../../scripts/chrysalis-hub-traces-upload.mjs", import.meta.url));
  const siteDir = join(root, "site-ws");
  try {
    const { startResumableUpload, appendUploadChunk, finishResumableUpload } = await import(UP);
    const meta = await startResumableUpload({
      projectId: "p1",
      siteId: "s1",
      filename: "trace.ndjson",
      totalBytes: 10,
    });
    await appendUploadChunk(meta.uploadId, 0, Buffer.from('{"a":1}\n'));
    const done = await finishResumableUpload(meta.uploadId, siteDir);
    expect(done.saved).toBe(1);
    expect(done.tracesDir).toMatch(/\.chrysalis[\\/]traces$/);
  } finally {
    process.env.CHRYSALIS_HUB_ROOT = prev;
    await rm(root, { recursive: true, force: true });
  }
});

test("hub runtime: probeRuntimeHealth rejects bad host", async () => {
  const { probeRuntimeHealth } = await import(
    fileURLToPath(new URL("../../../scripts/chrysalis-hub-runtime.mjs", import.meta.url))
  );
  const h = await probeRuntimeHealth("http://127.0.0.1:1");
  expect(h.ok).toBe(false);
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
