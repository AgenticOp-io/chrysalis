import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ingestDirectory } from "@chrysalis/ingest";
import { analyzeModule, stringDispatchRecognizer } from "@chrysalis/insight";
import { applyRewrites, dispatchUnionZodPass } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const tinyN1 = resolve(here, "../../../fixtures/tiny-n1");

describe("dispatch-union-zod pass", () => {
  it("rewires POST dispatch field and clears string-dispatch recognition", async () => {
    const m = await ingestDirectory(tinyN1);
    const report = analyzeModule(m);
    const op0 = report.opportunities.find((o) => o.recognizer === "string-dispatch");
    expect(op0).toBeDefined();
    const op = { ...op0!, confidence: 0.95 };
    const { module: next, report: rw } = applyRewrites(m, [op], [dispatchUnionZodPass], {
      minConfidence: 0.5,
      postVerifyRecognizers: [stringDispatchRecognizer],
    });
    expect(rw.applied).toHaveLength(1);
    expect(rw.applied[0]!.pass).toBe("dispatch-union-zod");
    expect(rw.postVerify?.ok).toBe(true);
    expect(stringDispatchRecognizer.recognize(next)).toHaveLength(0);
  });
});
