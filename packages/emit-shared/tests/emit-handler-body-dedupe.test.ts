import { describe, expect, test } from "vitest";
import {
  chrysalisBodyDedupeExportId,
  computeEmittedHandlerDedupeKey,
} from "../src/emit-handler-body-dedupe.js";

const minimalEmitted = (body: string) =>
  ({
    body,
    holes: [],
    effectNames: [],
    shape: "html" as const,
    domainTypeImports: [],
    usesQueryAllWhereIn: false,
    usesChrysalisBatchHelpers: false,
    usesZod: false,
    usesPhpFqnNew: false,
    usesPhpDynamicNew: false,
    libHelperImports: [],
  }) as const;

describe("emit-handler-body-dedupe", () => {
  test("computeEmittedHandlerDedupeKey ignores effect tag order", () => {
    const e = minimalEmitted("return x;");
    const a = computeEmittedHandlerDedupeKey(e, ["db.read", "session.write"]);
    const b = computeEmittedHandlerDedupeKey(e, ["session.write", "db.read"]);
    expect(a).toBe(b);
  });

  test("chrysalisBodyDedupeExportId is stable for a fixed key", () => {
    const k = computeEmittedHandlerDedupeKey(minimalEmitted("y;"), ["a"]);
    expect(chrysalisBodyDedupeExportId(k)).toBe(chrysalisBodyDedupeExportId(k));
    expect(chrysalisBodyDedupeExportId(k)).toMatch(/^chrysalisBodyDedupe_[0-9a-f]{16}$/);
  });
});
