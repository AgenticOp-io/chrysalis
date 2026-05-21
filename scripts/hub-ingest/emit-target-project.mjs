#!/usr/bin/env node
/**
 * Emit a starter project tree for any target web language (holes explicit; hub-open mission).
 * Usage: node scripts/hub-ingest/emit-target-project.mjs <projectDir> --origin python --output java
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { LANGUAGE_LABELS } from "./language-catalog.mjs";

const ENTRY_TEMPLATES = {
  python: (o, t) => ({
    "main.py": `"""Chrysalis hub: ${o} -> ${t}. Routes lifted to WebIR; fill holes to complete migration."""\n\n# HOLE: implement handlers from .chrysalis/hub.${o}.webir.json\n\ndef main() -> None:\n    raise NotImplementedError("hub:translate ${o} -> ${t}")\n\nif __name__ == "__main__":\n    main()\n`,
    "pyproject.toml": `[project]\nname = "chrysalis-hub-${t}"\nversion = "0.1.0"\nrequires-python = ">=3.10"\n`,
  }),
  java: (o, t) => ({
    "src/main/java/hub/App.java": `package hub;\n\n/** Chrysalis hub: ${o} -> ${t} */\npublic class App {\n  public static void main(String[] args) {\n    throw new UnsupportedOperationException("hub:translate ${o} -> ${t}");\n  }\n}\n`,
    "pom.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>hub</groupId>\n  <artifactId>chrysalis-${t}</artifactId>\n  <version>0.1.0</version>\n</project>\n`,
  }),
  kotlin: (o, t) => ({
    "src/main/kotlin/hub/App.kt": `package hub\n\n/** Chrysalis hub: ${o} -> ${t} */\nfun main() {\n    error("hub:translate ${o} -> ${t}")\n}\n`,
  }),
  go: (o, t) => ({
    "main.go": `package main\n\n// Chrysalis hub: ${o} -> ${t}\nfunc main() {\n\tpanic("hub:translate ${o} -> ${t}")\n}\n`,
    "go.mod": `module chrysalis-hub-${t}\n\ngo 1.22\n`,
  }),
  ruby: (o, t) => ({
    "lib/main.rb": `# Chrysalis hub: ${o} -> ${t}\nraise "hub:translate ${o} -> ${t}"\n`,
    "Gemfile": `source "https://rubygems.org"\ngem "chrysalis-hub-${t}", "0.1.0"\n`,
  }),
  csharp: (o, t) => ({
    "Program.cs": `// Chrysalis hub: ${o} -> ${t}\nConsole.WriteLine("hub:translate ${o} -> ${t}");\nthrow new NotImplementedException();\n`,
    "chrysalis-hub.csproj": `<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net8.0</TargetFramework>\n  </PropertyGroup>\n</Project>\n`,
  }),
  rust: (o, t) => ({
    "src/main.rs": `//! Chrysalis hub: ${o} -> ${t}\nfn main() {\n    panic!("hub:translate ${o} -> ${t}");\n}\n`,
    "Cargo.toml": `[package]\nname = "chrysalis-hub-${t}"\nversion = "0.1.0"\nedition = "2021"\n`,
  }),
  swift: (o, t) => ({
    "Sources/App.swift": `// Chrysalis hub: ${o} -> ${t}\nfatalError("hub:translate ${o} -> ${t}")\n`,
  }),
  scala: (o, t) => ({
    "src/main/scala/hub/App.scala": `package hub\n\n/** Chrysalis hub: ${o} -> ${t} */\nobject App extends App {\n  sys.error("hub:translate ${o} -> ${t}")\n}\n`,
  }),
  javascript: (o, t) => ({
    "src/index.js": `/** Chrysalis hub: ${o} -> ${t} */\nexport function main() {\n  throw new Error("hub:translate ${o} -> ${t}");\n}\n`,
    "package.json": `{\n  "name": "chrysalis-hub-${t}",\n  "version": "0.1.0",\n  "type": "module"\n}\n`,
  }),
  typescript: (o, t) => ({
    "src/index.ts": `/** Chrysalis hub: ${o} -> ${t} */\nexport function main(): never {\n  throw new Error("hub:translate ${o} -> ${t}");\n}\n`,
    "package.json": `{\n  "name": "chrysalis-hub-${t}",\n  "version": "0.1.0",\n  "type": "module"\n}\n`,
    "tsconfig.json": `{\n  "compilerOptions": { "strict": true, "target": "ES2022", "module": "NodeNext" }\n}\n`,
  }),
  php: (o, t) => ({
    "public/index.php": `<?php\n// Chrysalis hub: ${o} -> ${t}\nthrow new RuntimeException('hub:translate ${o} -> ${t}');\n`,
    "composer.json": `{\n  "name": "hub/chrysalis-${t}",\n  "require": { "php": "^8.2" }\n}\n`,
  }),
  vue: (o, t) => ({
    "src/App.vue": `<script setup lang="ts">\n// Chrysalis hub: ${o} -> ${t}\nthrow new Error("hub:translate ${o} -> ${t}")\n</script>\n<template><p>Chrysalis hub ${o} → ${t}</p></template>\n`,
  }),
  html: (o, t) => ({
    "index.html": `<!DOCTYPE html>\n<html><head><title>${o} → ${t}</title></head>\n<body><!-- Chrysalis hub --><p>HOLE: migrate from ${o}</p></body></html>\n`,
  }),
  css: (o, t) => ({
    "styles/main.css": `/* Chrysalis hub: ${o} -> ${t} */\nbody { /* HOLE: design tokens from ${o} */ }\n`,
  }),
  scss: (o, t) => ({
    "styles/main.scss": `// Chrysalis hub: ${o} -> ${t}\nbody { /* HOLE */ }\n`,
  }),
  sql: (o, t) => ({
    "schema/hub.sql": `-- Chrysalis hub: ${o} -> ${t}\n-- HOLE: derive schema from WebIR data effects\n`,
  }),
  json: (o, t) => ({
    "chrysalis-hub.json": JSON.stringify({ kind: "chrysalis.hub.emit", origin: o, target: t }, null, 2) + "\n",
  }),
  yaml: (o, t) => ({
    "chrysalis-hub.yaml": `kind: chrysalis.hub.emit\norigin: ${o}\ntarget: ${t}\n`,
  }),
  markdown: (o, t) => ({
    "README.md": `# Chrysalis hub output (${t})\n\nMigrated from **${o}**. See \`.chrysalis/hub.${o}.webir.json\`.\n`,
  }),
};

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "python";
  let output = "java";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-target-project.mjs <projectDir> --origin <lang> --output <lang>");
  return { projectDir, origin, output };
}

function defaultTemplate(o, t) {
  return {
    "README.md": `# ${LANGUAGE_LABELS[t] ?? t} (from ${LANGUAGE_LABELS[o] ?? o})\n\nGenerated by Chrysalis Translation Hub.\n`,
    "HOLES.txt": `hub:translate ${o} -> ${t}\n`,
  };
}

async function main() {
  const { projectDir, origin, output } = parseArgs(process.argv);
  const liftPath = join(projectDir, ".chrysalis", `hub.${origin}.lift.json`);
  let fileCount = 0;
  let routeCount = 0;
  try {
    const lift = JSON.parse(await readFile(liftPath, "utf8"));
    fileCount = lift.fileCount ?? 0;
    routeCount = lift.routeCount ?? 0;
  } catch {
    /* optional */
  }

  const outDir = join(projectDir, "generated", output);
  await mkdir(outDir, { recursive: true });

  const factory = ENTRY_TEMPLATES[output] ?? defaultTemplate;
  const files = factory(origin, output);
  for (const [rel, content] of Object.entries(files)) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }

  await writeFile(
    join(outDir, "chrysalis.hub.emit.json"),
    `${JSON.stringify(
      {
        kind: "chrysalis.hub.emit",
        schemaVersion: 1,
        origin,
        output,
        fileCount,
        routeCount,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ ok: true, outDir, origin, output, fileCount, routeCount }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
