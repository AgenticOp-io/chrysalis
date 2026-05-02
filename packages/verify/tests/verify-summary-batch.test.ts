import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VERIFY_SUMMARY_BATCH_KIND,
  VERIFY_SUMMARY_BATCH_SCHEMA_VERSION,
  VERIFY_SUMMARY_KIND,
} from "../src/verify-summary-batch.js";

const miniSummary = (baseUrl: string, reportDir: string) =>
  JSON.stringify({
    kind: VERIFY_SUMMARY_KIND,
    schemaVersion: 1,
    toolVersion: "1.0.1",
    corpusRoot: "fixtures/tiny-blog/traces",
    baseUrl,
    reportDir,
    summaryPath: `${reportDir}/summary.json`,
    threshold: 0.95,
    aggregate: { framesTotal: 1, framesPassed: 1, correctness: 1 },
    failedFrameCount: 0,
    failedTraceCount: 0,
    divergenceKinds: [],
    endpoints: [],
    pass: true,
  });

describe("verify summary.batch", () => {
  it("parses committed batch smoke JSON", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const p = resolve(here, "../../../fixtures/ci/verify-summary-batch-v1-smoke.json");
    const raw = readFileSync(p, "utf8");
    const j = JSON.parse(raw) as {
      kind: string;
      schemaVersion: number;
      itemCount: number;
      items: ReadonlyArray<{ kind: string }>;
    };
    expect(j.kind).toBe(VERIFY_SUMMARY_BATCH_KIND);
    expect(j.schemaVersion).toBe(VERIFY_SUMMARY_BATCH_SCHEMA_VERSION);
    expect(j.itemCount).toBe(2);
    expect(j.items).toHaveLength(2);
    expect(j.items.every((x) => x.kind === VERIFY_SUMMARY_KIND)).toBe(true);
  });

  it("aggregate script merges NDJSON lines", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-verify-summaries.mjs");
    const line = miniSummary("http://127.0.0.1:3000", "r0");
    const ndjson = `${line}\n${miniSummary("http://127.0.0.1:3001", "r1")}\n`;
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-vsum-"));
    try {
      const f = join(dir, "x.ndjson");
      writeFileSync(f, ndjson, "utf8");
      const out = execSync(`${JSON.stringify(process.execPath)} ${JSON.stringify(script)} ${JSON.stringify(f)}`, {
        encoding: "utf8",
        cwd: root,
      });
      const j = JSON.parse(out) as { kind: string; itemCount: number; items: unknown[] };
      expect(j.kind).toBe(VERIFY_SUMMARY_BATCH_KIND);
      expect(j.itemCount).toBe(2);
      expect(j.items).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("aggregate script accepts one pretty-printed summary file", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-verify-summaries.mjs");
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-vsum-pretty-"));
    try {
      const one = `${JSON.stringify(JSON.parse(miniSummary("http://127.0.0.1:9", "rp")), null, 2)}\n`;
      const f = join(dir, "one.json");
      writeFileSync(f, one, "utf8");
      const out = execSync(`${JSON.stringify(process.execPath)} ${JSON.stringify(script)} ${JSON.stringify(f)}`, {
        encoding: "utf8",
        cwd: root,
      });
      const j = JSON.parse(out) as { kind: string; itemCount: number };
      expect(j.kind).toBe(VERIFY_SUMMARY_BATCH_KIND);
      expect(j.itemCount).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("aggregate script exits 2 on wrong kind", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-verify-summaries.mjs");
    const r = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      input: `${JSON.stringify({ kind: "wrong" })}\n`,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/expected kind/i);
  });
});
