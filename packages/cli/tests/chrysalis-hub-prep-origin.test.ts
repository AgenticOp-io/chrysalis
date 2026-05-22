import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const PREP = fileURLToPath(new URL("../../../scripts/chrysalis-hub-prep-origin.mjs", import.meta.url));

test("hub prep: parseOriginPrepJson reads last JSON line", async () => {
  const { parseOriginPrepJson } = await import(PREP);
  const stdout = `installing agent...
{"kind":"chrysalis.origin.prep","schemaVersion":0,"scanAgentInstalled":true}
`;
  const j = parseOriginPrepJson(stdout);
  expect(j.kind).toBe("chrysalis.origin.prep");
  expect(j.scanAgentInstalled).toBe(true);
});

test("hub prep: parseOriginPrepJson rejects missing payload", async () => {
  const { parseOriginPrepJson } = await import(PREP);
  expect(() => parseOriginPrepJson("no json here\n")).toThrow(/chrysalis.origin.prep/);
});
