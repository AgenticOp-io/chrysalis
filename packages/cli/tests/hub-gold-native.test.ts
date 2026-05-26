import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");

test("hub gold native: java go ruby csharp rust kotlin scala swift suites (G42/G45)", () => {
  for (const suite of [
    "java-native-java",
    "go-native-go",
    "ruby-native-ruby",
    "csharp-native-csharp",
    "rust-native-rust",
    "kotlin-native-kotlin",
    "scala-native-scala",
    "swift-native-swift",
  ]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
});

test("hub verify tiers report: native structural suites registered (G42)", async () => {
  const { buildHubVerifyTiersReport } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/hub-verify-tiers.mjs", import.meta.url))
  );
  const { hubGoldSuitesForPair } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/hub-gold-manifest.mjs", import.meta.url))
  );
  const report = buildHubVerifyTiersReport();
  expect(report.kind).toBe("chrysalis.hub.verify-tiers");
  expect(report.tierCounts.structural).toBe(50);
  expect(hubGoldSuitesForPair("python", "python").map((s) => s.id)).toContain("python-native-python");
});
