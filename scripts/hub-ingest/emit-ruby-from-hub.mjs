#!/usr/bin/env node
/** Emit Sinatra-style Ruby routes from hub WebIR. */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";
import { renderRubyBody } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "ruby";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-ruby-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderRuby(routes, origin) {
  const lines = [
    `# Chrysalis hub emit: ${origin} -> ruby`,
    "require 'sinatra/base'",
    "require 'sinatra/json'",
    "",
    "class HubApp < Sinatra::Base",
    "  configure do",
    "    set :run, false",
    "  end",
    "",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    lines.push(`  ${m} ${JSON.stringify(r.path)} do`);
    const body = renderRubyBody(r.body);
    if (body.hole) holeCount += 1;
    for (const line of body.lines) lines.push(`    ${line}`);
    lines.push("  end");
    lines.push("");
  }
  lines.push("end");
  lines.push("");
  return {
    files: { "lib/routes.rb": `${lines.join("\n")}\n`, "Gemfile": 'source "https://rubygems.org"\ngem "sinatra"\ngem "sinatra-contrib"\n' },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "ruby", "hub-webir-ruby", renderRuby);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
