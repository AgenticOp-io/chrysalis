#!/usr/bin/env node
/** @deprecated Use emit-target-project.mjs — thin forwarder for existing callers. */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "emit-target-project.mjs");
const child = spawn(process.execPath, [script, ...process.argv.slice(2)], { stdio: "inherit" });
child.on("close", (code) => process.exit(code ?? 1));
