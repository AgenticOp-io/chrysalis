#!/usr/bin/env node
/** Emit ASP.NET minimal routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "csharp";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-csharp-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function csharpLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

function renderCsharp(routes, origin) {
  const lines = [
    "// Chrysalis hub emit",
    "var builder = WebApplication.CreateBuilder(args);",
    "var app = builder.Build();",
    "",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        const pairs = Object.entries(v).map(([k, val]) => `[${JSON.stringify(k)}] = ${csharpLiteral(val)}`);
        lines.push(`app.Map${m[0].toUpperCase()}${m.slice(1)}(${JSON.stringify(r.path)}, () => Results.Json(new Dictionary<string, object> { ${pairs.join(", ")} }));`);
      } else {
        lines.push(`app.Map${m[0].toUpperCase()}${m.slice(1)}(${JSON.stringify(r.path)}, () => ${csharpLiteral(v)});`);
      }
    } else {
      holeCount += 1;
      lines.push(`// HOLE ${r.path}: ${r.body.reason}`);
      lines.push(`app.Map${m[0].toUpperCase()}${m.slice(1)}(${JSON.stringify(r.path)}, () => throw new NotImplementedException(${JSON.stringify(r.body.reason)}));`);
    }
  }
  lines.push("app.Run();");
  lines.push("");
  return {
    files: {
      "Program.cs": lines.join("\n"),
      "chrysalis-hub.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>\n',
    },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "csharp", "hub-webir-csharp", renderCsharp);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
