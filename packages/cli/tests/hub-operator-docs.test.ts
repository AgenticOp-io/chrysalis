import { describe, expect, test } from "vitest";
import {
  HUB_OPERATOR_DOC_CATALOG,
  hubOperatorDocAliasMap,
  resolveHubOperatorDoc,
  resolveHubOperatorDocId,
} from "../../../scripts/hub-operator-docs.mjs";

describe("hub-operator-docs", () => {
  test("every catalog file exists on disk", () => {
    const missing = HUB_OPERATOR_DOC_CATALOG.filter((d) => !resolveHubOperatorDoc(d.id)?.abs);
    expect(missing.map((d) => d.file)).toEqual([]);
  });

  test("resolves slug by id, basename, and docs path", () => {
    expect(resolveHubOperatorDocId("open-web-llm")).toBe("open-web-llm");
    expect(resolveHubOperatorDocId("OPEN-WEB-LLM-PROGRAM.md")).toBe("open-web-llm");
    expect(resolveHubOperatorDocId("docs/OPEN-WEB-LLM-PROGRAM.md")).toBe("open-web-llm");
    expect(resolveHubOperatorDocId("DESIGN.md")).toBe("design");
    expect(resolveHubOperatorDocId("LLM-ASSISTED-CONVERT-PROGRAM.md")).toBe("llm-assisted-convert");
  });

  test("alias map covers markdown link shapes", () => {
    const aliases = hubOperatorDocAliasMap();
    expect(aliases["./OPEN-WEB-LLM-PROGRAM.md"]).toBe("open-web-llm");
    expect(aliases["docs/MIGRATION-OS.md"]).toBe("migration-os");
    expect(aliases["../DESIGN.md"]).toBe("design");
  });
});
