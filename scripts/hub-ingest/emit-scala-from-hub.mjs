#!/usr/bin/env node
/** Emit Akka HTTP-style Scala routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "scala";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-scala-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function scalaLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "null";
}

function renderScala(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> scala`,
    "package hub",
    "",
    'import akka.http.scaladsl.server.Directives._',
    'import akka.http.scaladsl.model._',
    'import akka.http.scaladsl.server.Route',
    'import spray.json.DefaultJsonProtocol._',
    'import spray.json._',
    "",
    "object HubRoutes {",
    "  val routes: Route = concat(",
  ];
  let holeCount = 0;
  const routeExprs = [];
  for (const r of routes) {
    const m = r.method.toUpperCase();
    const dir = m === "GET" ? "get" : m === "POST" ? "post" : m === "PUT" ? "put" : m === "DELETE" ? "delete" : "get";
    if (r.body.kind === "literal") {
      const v = r.body.value;
      let complete;
      if (v !== null && typeof v === "object") {
        const ent = Object.entries(v)
          .map(([k, val]) => `"${k}" -> ${scalaLiteral(val)}`)
          .join(", ");
        complete = `complete(Map(${ent}).toJson.compactPrint)`;
      } else if (typeof v === "boolean") {
        complete = `complete(${v}.toString)`;
      } else {
        complete = `complete(${scalaLiteral(v)})`;
      }
      routeExprs.push(`    ${dir}(path(${JSON.stringify(r.path)})) { ${complete} }`);
    } else {
      holeCount += 1;
      routeExprs.push(
        `    ${dir}(path(${JSON.stringify(r.path)})) { complete(StatusCodes.NotImplemented) /* HOLE: ${r.body.reason} */ }`,
      );
    }
  }
  if (routeExprs.length === 0) {
    holeCount += 1;
    routeExprs.push('    get(path("hub-empty")) { complete("HOLE: empty webir") }');
  }
  lines.push(routeExprs.join(",\n"));
  lines.push("  )");
  lines.push("}");
  lines.push("");
  return {
    files: {
      "src/main/scala/hub/HubRoutes.scala": `${lines.join("\n")}\n`,
      "build.sbt": 'scalaVersion := "2.13.12"\nlibraryDependencies += "com.typesafe.akka" %% "akka-http" % "10.5.0"\n',
    },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "scala", "hub-webir-scala", renderScala);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
