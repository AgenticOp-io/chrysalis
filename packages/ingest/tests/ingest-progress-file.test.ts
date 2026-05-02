import { readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  INGEST_PROGRESS_KIND,
  INGEST_PROGRESS_SCHEMA_VERSION,
  fingerprintIngestRouteList,
  ingestDirectory,
  parseIngestProgressJson,
  readIngestProgressFile,
} from "../src/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));

describe("ingest progress file (diagnostic JSON)", () => {
  it("writes chrysalis.ingest.progress after each route on tiny-blog", async () => {
    const root = join(HERE, "../../../fixtures/tiny-blog");
    const progressPath = join(HERE, "ingest-progress-snapshot.json");
    try {
      await ingestDirectory(root, { ingestProgressFile: progressPath });
      const raw = readFileSync(progressPath, "utf8");
      const j = JSON.parse(raw) as {
        kind: string;
        schemaVersion: number;
        manifestRouteFingerprint: string;
        completedRouteKeys: string[];
        sourceApp: string;
      };
      expect(j.kind).toBe(INGEST_PROGRESS_KIND);
      expect(j.schemaVersion).toBe(INGEST_PROGRESS_SCHEMA_VERSION);
      expect(j.sourceApp).toBe("tiny-blog");
      expect(j.completedRouteKeys.length).toBeGreaterThanOrEqual(1);
      const manifest = JSON.parse(
        readFileSync(join(root, "chrysalis.routes.json"), "utf8"),
      ) as { routes: Array<{ method: string; path: string; file: string }> };
      const fp = fingerprintIngestRouteList(manifest.routes);
      expect(j.manifestRouteFingerprint).toBe(fp);
      expect(j.completedRouteKeys.length).toBe(manifest.routes.length);
      const parsed = readIngestProgressFile(progressPath);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.value.completedRouteKeys.length).toBe(manifest.routes.length);
      }
    } finally {
      try {
        unlinkSync(progressPath);
      } catch {
        /* test cleanup */
      }
    }
  });

  it("parseIngestProgressJson accepts fixture smoke file and rejects bad kind", () => {
    const fixturePath = join(HERE, "../../../fixtures/ci/ingest-progress-v0-smoke.json");
    const fromDisk = readIngestProgressFile(fixturePath);
    expect(fromDisk.ok).toBe(true);
    if (fromDisk.ok) {
      expect(fromDisk.value.kind).toBe(INGEST_PROGRESS_KIND);
      expect(fromDisk.value.manifestRouteFingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
    const bad = parseIngestProgressJson(
      JSON.stringify({ kind: "other", schemaVersion: 0, toolVersion: "x", manifestRouteFingerprint: "a".repeat(64), sourceApp: "a", projectRoot: "/", completedRouteKeys: [], updatedAt: "t" }),
    );
    expect(bad.ok).toBe(false);
  });
});
