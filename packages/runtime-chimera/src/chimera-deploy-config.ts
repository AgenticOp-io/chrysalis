/**
 * Versioned JSON contract for `chrysalis deploy --config` (V2-M5 shared config source, DESIGN D253).
 * Unversioned objects (no `kind`) remain accepted for backward compatibility.
 */

import type { Mode, RouteRule, Target } from "./routing.js";

export const CHIMERA_DEPLOY_CONFIG_KIND = "chrysalis.chimera.config" as const;

export const CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION = 1 as const;

export interface ChimeraDeployConfigFile {
  readonly kind?: typeof CHIMERA_DEPLOY_CONFIG_KIND;
  readonly schemaVersion?: number;
  readonly mode?: Mode;
  readonly legacy?: string;
  readonly modern?: string;
  readonly rules?: ReadonlyArray<RouteRule>;
  readonly host?: string;
  readonly port?: number;
  readonly shadowLogDir?: string;
  readonly canary?: {
    readonly percentModern?: number;
    readonly salt?: string;
    readonly stickinessCookie?: string;
    readonly stickinessHeader?: string;
  };
  /** Optional operator metadata; not interpreted by the parser. */
  readonly toolVersion?: string;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const MODES = new Set<Mode>(["legacy", "cutover", "shadow", "canary"]);
const TARGETS = new Set<Target>(["legacy", "modern"]);

function parseRules(raw: unknown): ReadonlyArray<RouteRule> | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: RouteRule[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      return null;
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec.match !== "string" || rec.match.length === 0) {
      return null;
    }
    if (rec.target !== "legacy" && rec.target !== "modern") {
      return null;
    }
    out.push({ match: rec.match, target: rec.target });
  }
  return out;
}

function parseCanary(raw: unknown): ChimeraDeployConfigFile["canary"] | undefined | "bad" {
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== "object") return "bad";
  const rec = raw as Record<string, unknown>;
  const percentModern = rec.percentModern;
  if (percentModern !== undefined && (typeof percentModern !== "number" || !Number.isFinite(percentModern))) {
    return "bad";
  }
  if (percentModern !== undefined && (percentModern < 0 || percentModern > 100)) {
    return "bad";
  }
  const salt = rec.salt;
  if (salt !== undefined && typeof salt !== "string") return "bad";
  const stickinessCookie = rec.stickinessCookie;
  if (stickinessCookie !== undefined && typeof stickinessCookie !== "string") return "bad";
  const stickinessHeader = rec.stickinessHeader;
  if (stickinessHeader !== undefined && typeof stickinessHeader !== "string") return "bad";
  return {
    ...(percentModern !== undefined ? { percentModern } : {}),
    ...(typeof salt === "string" ? { salt } : {}),
    ...(typeof stickinessCookie === "string" ? { stickinessCookie } : {}),
    ...(typeof stickinessHeader === "string" ? { stickinessHeader } : {}),
  };
}

/**
 * Parse and lightly validate deploy config JSON. When `kind` is **`chrysalis.chimera.config`**,
 * **`schemaVersion`** must be **1**. Files without **`kind`** are treated as legacy implicit v0.
 */
export function parseChimeraDeployConfigJson(
  rawText: string,
  pathLabel: string,
): { ok: true; value: ChimeraDeployConfigFile } | { ok: false; message: string } {
  let root: unknown;
  try {
    root = JSON.parse(stripBom(rawText));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `${pathLabel}: invalid JSON (${msg})` };
  }
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return { ok: false, message: `${pathLabel}: expected a JSON object` };
  }
  const o = root as Record<string, unknown>;

  if (o.kind !== undefined && o.kind !== CHIMERA_DEPLOY_CONFIG_KIND) {
    return {
      ok: false,
      message: `${pathLabel}: unknown kind ${JSON.stringify(o.kind)} (expected ${JSON.stringify(CHIMERA_DEPLOY_CONFIG_KIND)} or omit kind for legacy files)`,
    };
  }
  if (o.kind === CHIMERA_DEPLOY_CONFIG_KIND) {
    const sv = o.schemaVersion;
    if (sv !== CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION) {
      return {
        ok: false,
        message: `${pathLabel}: ${CHIMERA_DEPLOY_CONFIG_KIND} requires schemaVersion ${CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION} (got ${JSON.stringify(sv)})`,
      };
    }
  }

  if (o.mode !== undefined) {
    if (typeof o.mode !== "string" || !MODES.has(o.mode as Mode)) {
      return { ok: false, message: `${pathLabel}: invalid mode ${JSON.stringify(o.mode)}` };
    }
  }

  for (const key of ["legacy", "modern", "host", "shadowLogDir"] as const) {
    const v = o[key];
    if (v !== undefined && typeof v !== "string") {
      return { ok: false, message: `${pathLabel}: ${key} must be a string when set` };
    }
  }
  if (o.port !== undefined) {
    if (typeof o.port !== "number" || !Number.isInteger(o.port) || o.port < 0 || o.port > 65535) {
      return { ok: false, message: `${pathLabel}: port must be an integer 0..65535 when set` };
    }
  }

  const rulesParsed = parseRules(o.rules);
  if (rulesParsed === null) {
    return { ok: false, message: `${pathLabel}: rules must be an array of { match: string, target: "legacy"|"modern" }` };
  }

  const canaryParsed = parseCanary(o.canary);
  if (canaryParsed === "bad") {
    return { ok: false, message: `${pathLabel}: invalid canary object` };
  }

  const toolVersion = o.toolVersion;
  if (toolVersion !== undefined && typeof toolVersion !== "string") {
    return { ok: false, message: `${pathLabel}: toolVersion must be a string when set` };
  }

  const value: ChimeraDeployConfigFile = {
    ...(o.kind === CHIMERA_DEPLOY_CONFIG_KIND
      ? { kind: CHIMERA_DEPLOY_CONFIG_KIND, schemaVersion: CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION }
      : {}),
    ...(typeof o.mode === "string" ? { mode: o.mode as Mode } : {}),
    ...(typeof o.legacy === "string" ? { legacy: o.legacy } : {}),
    ...(typeof o.modern === "string" ? { modern: o.modern } : {}),
    rules: rulesParsed,
    ...(typeof o.host === "string" ? { host: o.host } : {}),
    ...(typeof o.port === "number" ? { port: o.port } : {}),
    ...(typeof o.shadowLogDir === "string" ? { shadowLogDir: o.shadowLogDir } : {}),
    ...(canaryParsed !== undefined ? { canary: canaryParsed } : {}),
    ...(typeof toolVersion === "string" ? { toolVersion } : {}),
  };

  return { ok: true, value };
}
