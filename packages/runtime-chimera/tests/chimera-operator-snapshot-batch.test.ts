import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHIMERA_OPERATOR_SNAPSHOT_BATCH_KIND,
  CHIMERA_OPERATOR_SNAPSHOT_BATCH_SCHEMA_VERSION,
  CHIMERA_OPERATOR_SNAPSHOT_KIND,
} from "../src/chimera-operator-snapshot.js";

function runAggregateScript(root: string, scriptAbs: string, fileArgs: string[], stdin?: string) {
  const r = spawnSync(process.execPath, [scriptAbs, ...fileArgs], {
    cwd: root,
    encoding: "utf8",
    input: stdin,
    maxBuffer: 4 * 1024 * 1024,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("chimera operator-snapshot.batch fixture", () => {
  it("parses committed batch smoke JSON", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const p = resolve(here, "../../../fixtures/ci/chimera-operator-snapshot-batch-v1-smoke.json");
    const raw = readFileSync(p, "utf8");
    const j = JSON.parse(raw) as {
      kind: string;
      schemaVersion: number;
      itemCount: number;
      items: ReadonlyArray<{ kind: string }>;
    };
    expect(j.kind).toBe(CHIMERA_OPERATOR_SNAPSHOT_BATCH_KIND);
    expect(j.schemaVersion).toBe(CHIMERA_OPERATOR_SNAPSHOT_BATCH_SCHEMA_VERSION);
    expect(j.itemCount).toBe(2);
    expect(j.items).toHaveLength(2);
    expect(j.items.every((x) => x.kind === CHIMERA_OPERATOR_SNAPSHOT_KIND)).toBe(true);
  });

  it("aggregate script merges NDJSON lines", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-chimera-operator-snapshots.mjs");
    const snapPath = resolve(here, "../../../fixtures/ci/chimera-operator-snapshot-v1-smoke.json");
    const oneLine = JSON.stringify(JSON.parse(readFileSync(snapPath, "utf8")));
    const ndjson = `${oneLine}\n${oneLine}\n`;
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-agg-"));
    try {
      const f = join(dir, "ops.ndjson");
      writeFileSync(f, ndjson, "utf8");
      const out = execSync(`${JSON.stringify(process.execPath)} ${JSON.stringify(script)} ${JSON.stringify(f)}`, {
        encoding: "utf8",
        cwd: root,
      });
      const j = JSON.parse(out) as { kind: string; itemCount: number; items: unknown[] };
      expect(j.kind).toBe(CHIMERA_OPERATOR_SNAPSHOT_BATCH_KIND);
      expect(j.itemCount).toBe(2);
      expect(j.items).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("aggregate script reads NDJSON from stdin when given no file args", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-chimera-operator-snapshots.mjs");
    const snapPath = resolve(here, "../../../fixtures/ci/chimera-operator-snapshot-v1-smoke.json");
    const oneLine = JSON.stringify(JSON.parse(readFileSync(snapPath, "utf8")));
    const { status, stdout } = runAggregateScript(root, script, [], `${oneLine}\n`);
    expect(status).toBe(0);
    const j = JSON.parse(stdout) as { kind: string; itemCount: number };
    expect(j.kind).toBe(CHIMERA_OPERATOR_SNAPSHOT_BATCH_KIND);
    expect(j.itemCount).toBe(1);
  });

  it("aggregate script exits 2 on invalid JSON line", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-chimera-operator-snapshots.mjs");
    const { status, stderr } = runAggregateScript(root, script, [], "NOT_JSON\n");
    expect(status).toBe(2);
    expect(stderr).toMatch(/invalid JSON/i);
  });

  it("aggregate script exits 2 when kind is not chrysalis.chimera.operator-snapshot", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = resolve(here, "../../..");
    const script = resolve(root, "scripts/aggregate-chimera-operator-snapshots.mjs");
    const { status, stderr } = runAggregateScript(
      root,
      script,
      [],
      `${JSON.stringify({ kind: "wrong.kind" })}\n`,
    );
    expect(status).toBe(2);
    expect(stderr).toMatch(/expected kind/i);
  });
});
