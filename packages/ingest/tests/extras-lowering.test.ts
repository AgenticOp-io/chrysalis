import { describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestDirectory } from "../src/index.js";

describe("ingest: extra PHP lowerings", () => {
  test("parse_url + getrandmax + microtime(true) + uniqid", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-ex-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "ex",
          routes: [{ method: "GET", path: "/x", file: "pages/x.php", pathParams: [] }],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
$a = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$b = getrandmax();
$c = microtime(true);
$d = uniqid("p_", true);
echo htmlspecialchars($a . $b . $c . $d);
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      let parseUrlCalls = 0;
      let getrandmaxLits = 0;
      let epochFloat = 0;
      let uniqidTime = 0;
      let dechexCalls = 0;
      for (const [, n] of mod.nodes) {
        const callee = (n.attrs as { callee?: string }).callee;
        if (n.dialect === "data" && n.op === "call" && callee === "parseUrlComponent") {
          parseUrlCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "__dechex") {
          dechexCalls++;
        }
        if (n.dialect === "data" && n.op === "literal" && n.attrs.value === 2_147_483_647) {
          getrandmaxLits++;
        }
        if (n.dialect === "effect" && n.op === "time.now" && n.attrs.format === "epoch_float") {
          epochFloat++;
        }
        if (n.dialect === "effect" && n.op === "time.now" && n.attrs.format === "epoch_ms") {
          uniqidTime++;
        }
      }
      expect(parseUrlCalls).toBe(1);
      expect(getrandmaxLits).toBe(1);
      expect(epochFloat).toBe(1);
      expect(uniqidTime).toBe(1);
      expect(dechexCalls).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
