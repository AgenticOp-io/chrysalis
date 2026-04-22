/**
 * `observe()` — launches PHP's built-in server with the Chrysalis Oracle
 * prelude loaded via `auto_prepend_file`, configured to write NDJSON traces
 * into the provided directory.
 *
 * This is a *convenience* entrypoint for development and CI. In production, an
 * operator would arrange the same environment via `php.ini` or a docker
 * sidecar; the prelude itself has no dependency on how it got loaded.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { DEFAULT_REDACTION, canonicalJSON, type RedactionConfig } from "./redaction.js";

export interface ObserveOptions {
  readonly phpRoot: string; // directory served by `php -S` (docroot)
  readonly traceDir: string; // where NDJSON traces are written
  readonly preludePath: string; // absolute path to oracle-php/src/bootstrap.php
  readonly redaction?: RedactionConfig;
  readonly host?: string; // defaults to 127.0.0.1
  readonly port?: number; // defaults to 8080
  readonly phpBinary?: string; // defaults to "php" (resolved from PATH)
  readonly onStdout?: (chunk: string) => void;
  readonly onStderr?: (chunk: string) => void;
}

export interface ObserveHandle {
  readonly pid: number | undefined;
  readonly url: string;
  readonly traceDir: string;
  stop(): Promise<number>;
  readonly exited: Promise<number>;
}

export function startObserver(opts: ObserveOptions): ObserveHandle {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 8080;
  const traceDir = resolve(opts.traceDir);
  if (!existsSync(traceDir)) mkdirSync(traceDir, { recursive: true });

  const redaction = opts.redaction ?? DEFAULT_REDACTION;
  // The prelude expects { rules: [{path, kind}] }.
  const redactionJson = canonicalJSON({ rules: redaction.rules });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CHRYSALIS_TRACE_DIR: traceDir,
    CHRYSALIS_REDACTION_JSON: redactionJson,
  };

  const phpBinary = opts.phpBinary ?? "php";
  const args = [
    "-d",
    `auto_prepend_file=${resolve(opts.preludePath)}`,
    "-S",
    `${host}:${port}`,
    "-t",
    resolve(opts.phpRoot),
  ];

  const child: ChildProcess = spawn(phpBinary, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (b: Buffer) => opts.onStdout?.(b.toString("utf8")));
  child.stderr?.on("data", (b: Buffer) => opts.onStderr?.(b.toString("utf8")));

  const exited: Promise<number> = new Promise((resolveExit) => {
    child.once("exit", (code) => resolveExit(code ?? 0));
  });

  return {
    pid: child.pid,
    url: `http://${host}:${port}`,
    traceDir,
    async stop(): Promise<number> {
      if (!child.killed) child.kill("SIGTERM");
      return exited;
    },
    exited,
  };
}

/**
 * Loads a redaction config from `chrysalis.observe.json` in the given dir.
 * Falls back to {@link DEFAULT_REDACTION} when no file exists.
 */
export function loadObserveConfig(dir: string): RedactionConfig {
  const path = join(dir, "chrysalis.observe.json");
  if (!existsSync(path)) return DEFAULT_REDACTION;
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as { redaction?: { rules?: Array<{ path: string; kind: string }> } };
  const rules = parsed.redaction?.rules ?? [];
  return {
    rules: rules
      .filter((r) => r.kind === "drop" || r.kind === "hash" || r.kind === "mask")
      .map((r) => ({ path: r.path, kind: r.kind as "drop" | "hash" | "mask" })),
  };
}
