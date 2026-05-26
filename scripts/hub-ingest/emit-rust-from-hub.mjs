#!/usr/bin/env node
/** Emit actix-web routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "rust";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-rust-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderRust(routes, origin) {
  const lines = [
    "// Chrysalis hub emit",
    "use actix_web::{web, App, HttpResponse, HttpServer};",
    "",
    "async fn hole() -> HttpResponse {",
    '    HttpResponse::InternalServerError().body("hub:hole")',
    "}",
    "",
  ];
  let holeCount = 0;
  let idx = 0;
  for (const r of routes) {
    const fn = `h_${idx++}`;
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        lines.push(`async fn ${fn}() -> HttpResponse {`);
        lines.push(`    HttpResponse::Ok().json(serde_json::json!(${JSON.stringify(v)}))`);
        lines.push("}");
      } else if (typeof v === "boolean") {
        lines.push(`async fn ${fn}() -> HttpResponse { HttpResponse::Ok().body(${v ? '"true"' : '"false"'}) }`);
      } else if (typeof v === "number") {
        lines.push(`async fn ${fn}() -> HttpResponse { HttpResponse::Ok().body("${v}") }`);
      } else {
        lines.push(`async fn ${fn}() -> HttpResponse { HttpResponse::Ok().body(${JSON.stringify(String(v))}) }`);
      }
    } else {
      holeCount += 1;
      lines.push(`async fn ${fn}() -> HttpResponse { hole().await }`);
    }
    lines.push("");
  }
  lines.push("#[actix_web::main]");
  lines.push("async fn main() -> std::io::Result<()> {");
  lines.push("    HttpServer::new(|| {");
  lines.push("        App::new()");
  const actixVerb = { GET: "get", POST: "post", PUT: "put", PATCH: "patch", DELETE: "delete", HEAD: "head" };
  idx = 0;
  for (const r of routes) {
    const fn = `h_${idx++}`;
    const verb = actixVerb[r.method.toUpperCase()] ?? "get";
    lines.push(`            .route(${JSON.stringify(r.path)}, web::${verb}().to(${fn}))`);
  }
  lines.push("    })");
  lines.push('    .bind(("127.0.0.1", 8080))?.run()');
  lines.push("    .await");
  lines.push("}");
  lines.push("");
  return {
    files: {
      "src/main.rs": lines.join("\n"),
      "Cargo.toml":
        '[package]\nname = "chrysalis-hub-rust"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nactix-web = "4"\nserde_json = "1"\n',
    },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "rust", "hub-webir-rust", renderRust);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
