import { describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestDirectory } from "../src/index.js";

describe("ingest: time() and rand family", () => {
  test("lowers time() to effect.time.now unix; rand/mt_rand to bounded effect.random", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-tr-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "t",
          routes: [{ method: "GET", path: "/t", file: "pages/t.php", pathParams: [] }],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/t.php"),
        `<?php
$a = time();
$b = rand();
$c = rand(1, 6);
$d = mt_rand(10, 20);
$e = random_int(0, 1);
echo strval($a);
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      let timeUnix = 0;
      let randomNodes = 0;
      for (const [, n] of mod.nodes) {
        if (n.dialect === "effect" && n.op === "time.now") {
          timeUnix++;
          expect(n.attrs.format).toBe("unix");
          expect(n.type).toEqual({ kind: "int" });
          expect(n.operands.length).toBe(0);
        }
        if (n.dialect === "effect" && n.op === "random") {
          randomNodes++;
          expect(n.type).toEqual({ kind: "int" });
          expect(n.operands.length).toBe(2);
        }
      }
      expect(timeUnix).toBe(1);
      expect(randomNodes).toBe(4);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
