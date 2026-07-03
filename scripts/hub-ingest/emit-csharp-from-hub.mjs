#!/usr/bin/env node
/** Emit ASP.NET minimal routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";
import { renderCsharpBody, toAspNetPath, hubPathParamNames } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "csharp";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-csharp-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
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
    const map = `Map${m[0].toUpperCase()}${m.slice(1)}`;
    const aspPath = toAspNetPath(r.path);
    const body = renderCsharpBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    if (body.hole) {
      lines.push(`// HOLE ${r.path}: ${r.body.reason ?? "hub:hole"}`);
      lines.push(`app.${map}(${JSON.stringify(aspPath)}, () => throw new NotImplementedException(${JSON.stringify(r.body.reason ?? "hub:hole")}));`);
      continue;
    }
    const params =
      body.lambdaParams ||
      hubPathParamNames(r.path)
        .map((n) => `string ${n}`)
        .join(", ");
    const arrowBody = body.lines[0].replace(/;\s*$/, "");
    if (params) {
      lines.push(`app.${map}(${JSON.stringify(aspPath)}, (${params}) => ${arrowBody});`);
    } else if (arrowBody.startsWith("Results.")) {
      lines.push(`app.${map}(${JSON.stringify(aspPath)}, () => ${arrowBody});`);
    } else {
      lines.push(`app.${map}(${JSON.stringify(aspPath)}, () => ${arrowBody});`);
    }
  }
  lines.push("app.Run();");
  lines.push("");
  lines.push("public partial class Program { }");
  lines.push("");
  return {
    files: {
      "Program.cs": lines.join("\n"),
      "chrysalis-hub.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>\n',
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
