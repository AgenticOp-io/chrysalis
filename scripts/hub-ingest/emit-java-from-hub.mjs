#!/usr/bin/env node
/**
 * Emit Spring-style Java routes from hub-lift WebIR.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "java";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-java-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

/**
 * @param {unknown} value
 */
function javaLiteralExpr(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

/**
 * @param {import('./hub-webir-routes.mjs').listHubWebRoutes extends (...args: any) => infer R ? R : never} routes
 */
function renderJava(routes, origin) {
  const lines = [
    "package hub;",
    "",
    "import org.springframework.web.bind.annotation.*;",
    "import java.util.Map;",
    "",
    `/** Chrysalis hub emit: ${origin} -> java */`,
    "@RestController",
    "public class HubRoutes {",
  ];
  let holeCount = 0;
  const annFor = {
    GET: "GetMapping",
    POST: "PostMapping",
    PUT: "PutMapping",
    PATCH: "PatchMapping",
    DELETE: "DeleteMapping",
    HEAD: "GetMapping",
    OPTIONS: "GetMapping",
  };
  for (const r of routes) {
    const ann = annFor[r.method.toUpperCase()] ?? "GetMapping";
    const fn = r.handlerName.replace(/[^a-zA-Z0-9_]/g, "_");
    lines.push(`  @${ann}(${JSON.stringify(r.path)})`);
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        const ent = Object.entries(v);
        const map = ent.map(([k, val]) => `"${k}", ${javaLiteralExpr(val)}`).join(", ");
        lines.push(`  public Map<String, Object> ${fn}() {`);
        lines.push(`    return Map.of(${map});`);
        lines.push("  }");
      } else {
        const ret = typeof v === "boolean" ? "boolean" : typeof v === "number" ? "int" : "String";
        lines.push(`  public ${ret} ${fn}() {`);
        lines.push(`    return ${javaLiteralExpr(v)};`);
        lines.push("  }");
      }
    } else {
      holeCount += 1;
      lines.push(`  public void ${fn}() {`);
      lines.push(`    // HOLE: ${r.body.reason}`);
      lines.push(`    throw new UnsupportedOperationException(${JSON.stringify(r.body.reason)});`);
      lines.push("  }");
    }
    lines.push("");
  }
  if (routes.length === 0) {
    holeCount += 1;
    lines.push("  // HOLE: no routes in hub WebIR");
    lines.push('  public void empty() { throw new UnsupportedOperationException("hub:empty-webir"); }');
  }
  lines.push("}");
  lines.push("");
  return { source: lines.join("\n"), holeCount };
}

async function writeEmitReport(projectDir, origin, report) {
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { source, holeCount } = renderJava(routes, origin);
  const outDir = join(projectDir, "generated", "java");
  await mkdir(join(outDir, "src/main/java/hub"), { recursive: true });
  await writeFile(join(outDir, "src/main/java/hub/HubRoutes.java"), source, "utf8");
  await writeFile(
    join(outDir, "pom.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>hub</groupId>\n  <artifactId>chrysalis-hub-java</artifactId>\n  <version>0.1.0</version>\n</project>\n`,
    "utf8",
  );
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "java",
    path: "hub-webir-java",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await writeEmitReport(projectDir, origin, report);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
