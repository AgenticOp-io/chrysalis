/**
 * Versioned JSON contract for `chrysalis deploy --config` (V2-M5 shared config source, DESIGN D253).
 * Unversioned objects (no `kind`) remain accepted for backward compatibility.
 *
 * Optional **`hmacSha256`** authenticates the JSON object excluding that field, using
 * **`stableStringifyChimeraDeploySigningPayload`** + **HMAC-SHA256** (**DESIGN D255**).
 * It may be a **64-hex string** or an **object** mapping opaque key ids to hex digests (**DESIGN D257**).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Mode, RouteRule, Target } from "./routing.js";

export const CHIMERA_DEPLOY_CONFIG_KIND = "chrysalis.chimera.config" as const;

export const CHIMERA_DEPLOY_CONFIG_SCHEMA_VERSION = 1 as const;

export interface ParseChimeraDeployConfigOptions {
  /** When **`hmacSha256`** is a hex string, this secret is tried first. */
  readonly hmacSecret?: string;
  /**
   * When **`hmacSha256`** is a hex string, try these after **`hmacSecret`** (rotation windows).
   */
  readonly hmacPreviousSecrets?: readonly string[];
  /**
   * When **`hmacSha256`** is an object **`{ [keyId]: hex }`**, supply the matching secret per id.
   * Verification succeeds if **any** entry matches.
   */
  readonly hmacSecretsByKeyId?: Readonly<Record<string, string>>;
}

/** Recursive JSON with sorted object keys (signing payload only; excludes **`hmacSha256`**). */
export function stableStringifyChimeraDeploySigningPayload(obj: Record<string, unknown>): string {
  return stableStringifyUnknown(obj);
}

function stableStringifyUnknown(v: unknown): string {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "string") return JSON.stringify(v);
  if (t === "number") return JSON.stringify(v);
  if (t === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringifyUnknown).join(",")}]`;
  if (t === "object") {
    const rec = v as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    const inner = keys.map((k) => `${JSON.stringify(k)}:${stableStringifyUnknown(rec[k])}`);
    return `{${inner.join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Operator helper: HMAC-SHA256 hex for a deploy JSON object **without** **`hmacSha256`**. */
export function computeChimeraDeployConfigHmacHex(
  deployFieldsOnly: Record<string, unknown>,
  secret: string,
): string {
  const payload = stableStringifyChimeraDeploySigningPayload(deployFieldsOnly);
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Build **`hmacSha256`** as an object of digests (same signing payload for each key id), for dual-key
 * publication in one JSON document during KMS rotation.
 */
export function computeChimeraDeployConfigHmacHexByKeyIds(
  deployFieldsOnly: Record<string, unknown>,
  keyIdToSecret: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [keyId, secret] of Object.entries(keyIdToSecret)) {
    out[keyId] = computeChimeraDeployConfigHmacHex(deployFieldsOnly, secret);
  }
  return out;
}

const HEX64 = /^[0-9a-fA-F]{64}$/;

function verifyHmacHexAgainstSecrets(
  restUnknown: Record<string, unknown>,
  hexField: string,
  secrets: readonly string[],
): boolean {
  if (secrets.length === 0) return false;
  const payload = stableStringifyChimeraDeploySigningPayload(restUnknown);
  const got = Buffer.from(hexField.toLowerCase(), "hex");
  for (const secret of secrets) {
    const expected = createHmac("sha256", secret).update(payload, "utf8").digest();
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true;
  }
  return false;
}

function collectStringHmacSecrets(options?: ParseChimeraDeployConfigOptions): string[] {
  const out: string[] = [];
  if (typeof options?.hmacSecret === "string" && options.hmacSecret.length > 0) {
    out.push(options.hmacSecret);
  }
  for (const s of options?.hmacPreviousSecrets ?? []) {
    if (typeof s === "string" && s.length > 0) out.push(s);
  }
  return out;
}

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
  options?: ParseChimeraDeployConfigOptions,
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

  const hmacField = o.hmacSha256;
  if (hmacField !== undefined) {
    const restUnknown: Record<string, unknown> = { ...o };
    delete restUnknown.hmacSha256;

    if (typeof hmacField === "string") {
      if (!HEX64.test(hmacField)) {
        return {
          ok: false,
          message: `${pathLabel}: hmacSha256 must be a 64-character hexadecimal string when it is a string`,
        };
      }
      const secrets = collectStringHmacSecrets(options);
      if (secrets.length === 0) {
        return {
          ok: false,
          message: `${pathLabel}: config declares hmacSha256 but no HMAC secret was provided (set CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET or pass --config-hmac-secret <secret>; optional CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS JSON array during rotation)`,
        };
      }
      if (!verifyHmacHexAgainstSecrets(restUnknown, hmacField, secrets)) {
        return { ok: false, message: `${pathLabel}: hmacSha256 verification failed` };
      }
    } else if (hmacField && typeof hmacField === "object" && !Array.isArray(hmacField)) {
      const hmap = hmacField as Record<string, unknown>;
      const keyIds = Object.keys(hmap);
      if (keyIds.length === 0) {
        return { ok: false, message: `${pathLabel}: hmacSha256 object must not be empty` };
      }
      const byId = options?.hmacSecretsByKeyId;
      if (!byId || typeof byId !== "object") {
        return {
          ok: false,
          message: `${pathLabel}: hmacSha256 is an object; provide key id → secret map (CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON or ParseChimeraDeployConfigOptions.hmacSecretsByKeyId)`,
        };
      }
      let anyVerified = false;
      for (const keyId of keyIds) {
        const hexVal = hmap[keyId];
        if (typeof hexVal !== "string" || !HEX64.test(hexVal)) {
          return {
            ok: false,
            message: `${pathLabel}: hmacSha256.${keyId} must be a 64-character hexadecimal string`,
          };
        }
        const secret = byId[keyId];
        if (typeof secret !== "string" || secret.length === 0) continue;
        const payload = stableStringifyChimeraDeploySigningPayload(restUnknown);
        const expected = createHmac("sha256", secret).update(payload, "utf8").digest();
        const got = Buffer.from(hexVal.toLowerCase(), "hex");
        if (got.length === expected.length && timingSafeEqual(got, expected)) {
          anyVerified = true;
          break;
        }
      }
      if (!anyVerified) {
        return {
          ok: false,
          message: `${pathLabel}: hmacSha256 object did not verify against any supplied key id secret`,
        };
      }
    } else {
      return {
        ok: false,
        message: `${pathLabel}: hmacSha256 must be a 64-character hex string or a non-empty object of key id → hex digest`,
      };
    }
  }

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
