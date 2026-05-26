#!/usr/bin/env node
/** Emit Ktor-style Kotlin routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "kotlin";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-kotlin-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function ktLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

function renderKotlin(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> kotlin`,
    "package hub",
    "",
    'import io.ktor.server.application.*',
    'import io.ktor.server.response.*',
    'import io.ktor.server.routing.*',
    'import io.ktor.http.*',
    "",
    "fun Application.hubRoutes() {",
    "    routing {",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    lines.push(`        ${m}(${JSON.stringify(r.path)}) {`);
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        const ent = Object.entries(v)
          .map(([k, val]) => `"${k}" to ${ktLiteral(val)}`)
          .join(", ");
        lines.push(`            call.respond(mapOf(${ent}))`);
      } else if (typeof v === "boolean") {
        lines.push(`            call.respond(${v})`);
      } else {
        lines.push(`            call.respondText(${ktLiteral(v)})`);
      }
    } else {
      holeCount += 1;
      lines.push(`            // HOLE: ${r.body.reason}`);
      lines.push(`            error(${JSON.stringify(r.body.reason)})`);
    }
    lines.push("        }");
  }
  if (routes.length === 0) holeCount += 1;
  lines.push("    }");
  lines.push("}");
  lines.push("");
  return {
    files: {
      "src/main/kotlin/hub/HubRoutes.kt": `${lines.join("\n")}\n`,
      "build.gradle.kts": 'plugins { kotlin("jvm") version "1.9.0" }\ndependencies { implementation("io.ktor:ktor-server-core:2.3.0") }\n',
    },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "kotlin", "hub-webir-kotlin", renderKotlin);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
