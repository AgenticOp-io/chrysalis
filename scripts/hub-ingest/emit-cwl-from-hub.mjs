#!/usr/bin/env node
/** Emit CWL source from hub WebIR (round-trip projection). */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "cwl";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-cwl-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function cwlLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (value !== null && typeof value === "object") {
    const ent = Object.entries(value).map(([k, v]) => `${k}: ${cwlLiteral(v)}`);
    return `{ ${ent.join(", ")} }`;
  }
  return "null";
}

function renderCwl(routes, origin) {
  const lines = [
    `# Chrysalis Web Language — hub emit from ${origin}`,
    "module hub;",
    "",
  ];
  let holeCount = 0;
  for (const r of routes) {
    lines.push(`@route ${r.method} "${r.path}"`);
    lines.push(`handler ${r.handlerName} {`);
    lines.push("  effects: none;");
    if (r.body.kind === "literal") {
      lines.push(`  return ${cwlLiteral(r.body.value)};`);
    } else {
      holeCount += 1;
      lines.push(`  hole ${JSON.stringify(r.body.reason ?? "hub:cwl:unmapped")};`);
    }
    lines.push("}");
    lines.push("");
  }
  return {
    files: { "routes.cwl": `${lines.join("\n")}\n` },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "cwl", "hub-webir-cwl", renderCwl);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
