#!/usr/bin/env node
/** Emit Vapor-style Swift routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "swift";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-swift-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function swiftLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "nil";
}

function renderSwift(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> swift`,
    "import Vapor",
    "",
    "func hubRoutes(_ routes: RoutesBuilder) throws {",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    lines.push(`    routes.${m}(${JSON.stringify(r.path)}) { req in`);
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        const ent = Object.entries(v)
          .map(([k, val]) => `"${k}": ${swiftLiteral(val)}`)
          .join(", ");
        lines.push(`        return [${ent}]`);
      } else if (typeof v === "boolean") {
        lines.push(`        return ${v}`);
      } else {
        lines.push(`        return ${swiftLiteral(v)}`);
      }
    } else {
      holeCount += 1;
      lines.push(`        // HOLE: ${r.body.reason}`);
      lines.push(`        throw Abort(.notImplemented, reason: ${JSON.stringify(r.body.reason)})`);
    }
    lines.push("    }");
  }
  if (routes.length === 0) holeCount += 1;
  lines.push("}");
  lines.push("");
  return {
    files: {
      "Sources/HubRoutes/routes.swift": `${lines.join("\n")}\n`,
      "Package.swift":
        '// swift-tools-version:5.9\nimport PackageDescription\nlet package = Package(name: "ChrysalisHubSwift", dependencies: [.package(url: "https://github.com/vapor/vapor.git", from: "4.0.0")], targets: [.target(name: "HubRoutes", dependencies: [.product(name: "Vapor", package: "vapor")])])\n',
    },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "swift", "hub-webir-swift", renderSwift);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
