import { readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  INGEST_PROGRESS_KIND,
  INGEST_PROGRESS_SCHEMA_VERSION,
  fingerprintIngestRouteList,
  ingestDirectory,
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
    } finally {
      try {
        unlinkSync(progressPath);
      } catch {
        /* test cleanup */
      }
    }
  });
});
