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
import {
  DEFAULT_REDACTION,
  canonicalJSON,
  mergeObserveFileRulesWithDefaults,
  type RedactionConfig,
  type RedactionRule,
} from "./redaction.js";

function parseObserveRedactionRules(parsedRoot: unknown, absConfigPath: string): RedactionRule[] {
  if (parsedRoot === null || typeof parsedRoot !== "object" || Array.isArray(parsedRoot)) {
    throw new Error(`chrysalis.observe.json (${absConfigPath}): root value must be a JSON object`);
  }
  const root = parsedRoot as Record<string, unknown>;
  const red = root.redaction;
  if (red === undefined) return [];
  if (red === null || typeof red !== "object" || Array.isArray(red)) {
    throw new Error(`chrysalis.observe.json (${absConfigPath}): "redaction" must be a JSON object`);
  }
  const rulesRaw = (red as Record<string, unknown>).rules;
  if (rulesRaw === undefined) return [];
  if (!Array.isArray(rulesRaw)) {
    throw new Error(`chrysalis.observe.json (${absConfigPath}): redaction.rules must be an array`);
  }
  const out: RedactionRule[] = [];
  for (let i = 0; i < rulesRaw.length; i++) {
    const r = rulesRaw[i];
    if (r === null || typeof r !== "object" || Array.isArray(r)) {
      throw new Error(`chrysalis.observe.json (${absConfigPath}): redaction.rules[${i}] must be an object`);
    }
    const rec = r as Record<string, unknown>;
    const kind = rec.kind;
    if (kind !== "drop" && kind !== "hash" && kind !== "mask") continue;
    const p = rec.path;
    if (typeof p !== "string" || p.trim() === "") {
      throw new Error(
        `chrysalis.observe.json (${absConfigPath}): redaction.rules[${i}] has supported kind ${String(kind)} but "path" must be a non-empty string`,
      );
    }
    out.push({ path: p.trim(), kind });
  }
  return out;
}

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
 * When the file exists, its rules are **merged** onto {@link DEFAULT_REDACTION}
 * (same `path` overrides `kind`; extra paths append). When absent, returns
 * defaults unchanged.
 *
 * Malformed JSON or invalid shapes throw {@link Error} with the config path in
 * the message (unknown rule `kind` values are skipped; supported kinds require a
 * non-empty string `path`).
 */
export function loadObserveConfig(dir: string): RedactionConfig {
  const observePath = join(dir, "chrysalis.observe.json");
  if (!existsSync(observePath)) return DEFAULT_REDACTION;
  const absConfigPath = resolve(observePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(observePath, "utf8"));
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse chrysalis.observe.json (${absConfigPath}): ${m}`);
  }
  const normalized = parseObserveRedactionRules(parsed, absConfigPath);
  return { rules: mergeObserveFileRulesWithDefaults(normalized) };
}
