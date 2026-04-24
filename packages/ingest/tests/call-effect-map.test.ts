import { describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { effectTagsSorted } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

describe("ingest: route-file call effects", () => {
  test("merges effects from a same-file top-level function into the handler", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
function row_from_users() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
$r = row_from_users();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.read:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
