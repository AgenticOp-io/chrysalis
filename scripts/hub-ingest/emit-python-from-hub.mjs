#!/usr/bin/env node
/**
 * Emit Flask routes from hub-lift WebIR (literal returns lowered; holes explicit).
 * Usage: node scripts/hub-ingest/emit-python-from-hub.mjs <projectDir> --origin python
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hubWebirPath, loadWebir } from "./shared.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "python";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-python-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

/**
 * @param {unknown} value
 */
function pyLiteral(value) {
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "None";
}

/**
 * @param {string} name
 */
function pyHandlerName(name) {
  const safe = name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1");
  return safe || "handler";
}

/**
 * @param {ReturnType<typeof listHubWebRoutes>} routes
 * @param {string} origin
 */
function renderFlaskApp(routes, origin) {
  const lines = [
    `"""Chrysalis hub emit: ${origin} -> python (Flask)."""`,
    "from flask import Flask, jsonify",
    "",
    "app = Flask(__name__)",
    "",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const fn = pyHandlerName(r.handlerName);
    const dec = `@app.route(${JSON.stringify(r.path)}, methods=[${JSON.stringify(r.method)}])`;
    lines.push(dec);
    lines.push(`def ${fn}():`);
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        lines.push(`    return jsonify(${JSON.stringify(v)})`);
      } else {
        lines.push(`    return ${pyLiteral(v)}`);
      }
    } else {
      holeCount += 1;
      lines.push(`    # HOLE: ${r.body.reason}`);
      lines.push(`    raise NotImplementedError(${JSON.stringify(r.body.reason)})`);
    }
    lines.push("");
  }
  if (routes.length === 0) {
    lines.push("# HOLE: no routes in hub WebIR");
    lines.push("def main() -> None:");
    lines.push('    raise NotImplementedError("hub:empty-webir")');
    lines.push("");
    holeCount += 1;
  }
  lines.push('if __name__ == "__main__":');
  lines.push("    app.run(host='127.0.0.1', port=5000, debug=False)");
  lines.push("");
  return { source: lines.join("\n"), holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const webir = await loadWebir();
  const raw = JSON.parse(await readFile(hubWebirPath(projectDir, origin), "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const routes = listHubWebRoutes(mod);
  const { source, holeCount } = renderFlaskApp(routes, origin);

  const outDir = join(projectDir, "generated", "python");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "main.py"), source, "utf8");
  await writeFile(
    join(outDir, "pyproject.toml"),
    `[project]\nname = "chrysalis-hub-python"\nversion = "0.1.0"\nrequires-python = ">=3.10"\ndependencies = ["flask>=3.0"]\n`,
    "utf8",
  );

  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "python",
    path: "hub-webir-python",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
