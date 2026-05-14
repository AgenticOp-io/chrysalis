import { unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { deserializeModuleCheckpoint, serializeModuleCheckpoint } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const ck = resolve(__dirname, "ingest-checkpoint-resume-tmp.json");

test("module checkpoint round-trips tiny-blog ingest", async () => {
  const mod = await ingestDirectory(FIXTURE, {});
  const json = serializeModuleCheckpoint(mod);
  const again = deserializeModuleCheckpoint(json);
  expect(again.roots.length).toBe(mod.roots.length);
  expect(again.nodes.size).toBe(mod.nodes.size);
});

test("ingest resume from checkpoint matches cold ingest", async () => {
  const cold = await ingestDirectory(FIXTURE, {});
  await ingestDirectory(FIXTURE, { ingestCheckpointFile: ck });
  const resumed = await ingestDirectory(FIXTURE, {
    ingestCheckpointFile: ck,
    ingestResumeFromCheckpoint: true,
  });
  expect(resumed.nodes.size).toBe(cold.nodes.size);
  expect(resumed.roots.length).toBe(cold.roots.length);
  try {
    unlinkSync(ck);
  } catch {
    /* ignore */
  }
});
