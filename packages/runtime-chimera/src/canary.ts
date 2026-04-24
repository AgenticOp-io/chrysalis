/**
 * Deterministic canary bucketing for percentage routing + stickiness.
 */

import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { CanarySettings } from "./routing.js";

/** 0..99 inclusive; stable for a given key + salt. */
export function canaryBucket(key: string, salt: string): number {
  const h = createHash("sha256")
    .update(salt, "utf8")
    .update("\0chrysalis-canary\0", "utf8")
    .update(key, "utf8")
    .digest();
  return h.readUInt32BE(0) % 100;
}

export function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header || !name) return null;
  const parts = header.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx <= 0) continue;
    const k = p.slice(0, idx).trim();
    if (k !== name) continue;
    try {
      return decodeURIComponent(p.slice(idx + 1).trim());
    } catch {
      return p.slice(idx + 1).trim();
    }
  }
  return null;
}

/**
 * Build a stickiness key for hashing. Order: cookie, header, client IP.
 */
export function stickinessKeyForRequest(
  req: IncomingMessage,
  settings: Pick<CanarySettings, "stickinessCookie" | "stickinessHeader">,
): string {
  const cookieHeader = req.headers["cookie"];
  const cookieHeaderStr = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader;
  if (settings.stickinessCookie) {
    const v = parseCookieHeader(cookieHeaderStr, settings.stickinessCookie);
    if (v !== null && v !== "") return `c:${settings.stickinessCookie}=${v}`;
  }
  if (settings.stickinessHeader) {
    const hn = settings.stickinessHeader.toLowerCase();
    const raw = req.headers[hn];
    const val = Array.isArray(raw) ? raw.join(",") : raw;
    if (val !== undefined && val !== "") return `h:${hn}:${val}`;
  }
  const ip =
    (typeof req.socket.remoteAddress === "string" && req.socket.remoteAddress) || "unknown";
  return `ip:${ip}`;
}

export function resolveCanaryTarget(args: {
  readonly eligibleModern: boolean;
  readonly settings: CanarySettings;
  readonly req: IncomingMessage;
}): { readonly target: "legacy" | "modern"; readonly canaryTag: "n/a" | "in" | "out" } {
  if (!args.eligibleModern) {
    return { target: "legacy", canaryTag: "n/a" };
  }
  const pct = Math.min(100, Math.max(0, args.settings.percentModern));
  if (pct <= 0) return { target: "legacy", canaryTag: "out" };
  if (pct >= 100) return { target: "modern", canaryTag: "in" };
  const key = stickinessKeyForRequest(args.req, args.settings);
  const bucket = canaryBucket(key, args.settings.salt);
  if (bucket < pct) return { target: "modern", canaryTag: "in" };
  return { target: "legacy", canaryTag: "out" };
}
