#!/usr/bin/env node
/** Post-G7790 WISP full-site helpers (Phase 28 production POC). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @returns {boolean} WISP full-site program closed (G7790). */
export function isWispFullSiteProgramClosed() {
  const path = join(scriptRoot, "docs/WISP-FULL-SITE-CWL-PROGRAM.md");
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  return text.includes("Program closed") && text.includes("G7790");
}

/** @returns {boolean} WISP production POC program active (G7800). */
export function isWispProductionPocProgramActive() {
  if (isWispProductionPocProgramClosed()) return false;
  const path = join(scriptRoot, "docs/WISP-PRODUCTION-POC-PROGRAM.md");
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  return text.includes("**Status:** **active**") && text.includes("G7800");
}

/** @returns {boolean} WISP production POC program closed (G7890). */
export function isWispProductionPocProgramClosed() {
  const path = join(scriptRoot, "docs/WISP-PRODUCTION-POC-PROGRAM.md");
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  return text.includes("Program closed") && text.includes("G7890");
}

/** @returns {boolean} Native API + zero-hole fixture mode (post Phase 27). */
export function isWispNativeCutoverMode() {
  return isWispFullSiteProgramClosed() || isWispProductionPocProgramActive() || isWispProductionPocProgramClosed();
}

/** Expected x-chrysalis-wisp-proxy for /api/* in native cutover mode. */
export const WISP_NATIVE_API_PROXY_HEADER = "cwl-native-api";

/** Expected x-chrysalis-wisp-proxy for legacy chimera backend proxy. */
export const WISP_BACKEND_PROXY_HEADER = "backend";

/**
 * @param {string | null | undefined} proxyHeader
 * @param {boolean} [nativeMode]
 */
export function isWispApiProxyHeaderOk(proxyHeader, nativeMode = isWispNativeCutoverMode()) {
  const h = proxyHeader ?? "";
  return nativeMode ? h === WISP_NATIVE_API_PROXY_HEADER : h === WISP_BACKEND_PROXY_HEADER;
}

/**
 * @param {Array<Record<string, unknown>>} scenarios
 * @returns {Array<Record<string, unknown>>}
 */
export function applyPostG7790ScenarioMetadata(scenarios) {
  if (!isWispNativeCutoverMode()) return scenarios;
  return scenarios.map((s) => {
    const id = String(s.id ?? "");
    if (id === "firebase-auth") {
      return {
        ...s,
        cwlPhase: 27,
        hole: null,
        conversionStatus: "native-cwl-session",
        convertedBy: "G7704",
      };
    }
    if (id === "api-jwt-tenant" || id === "backend-mongodb") {
      return {
        ...s,
        cwlPhase: 27,
        hole: null,
        conversionStatus: "native-cwl-handlers",
        backendConversion: "native-cwl-handlers",
        convertedBy: "G7702",
      };
    }
    if (id === "platform-shell" || id === "tenant-guard") {
      return {
        ...s,
        cwlPhase: 27,
        hole: null,
        conversionStatus: "native-cwl-ui",
        convertedBy: "G7703",
      };
    }
    if (id === "arcgis-mapview" || id === "arcgis-geocode" || id === "shared-map-iframe") {
      return {
        ...s,
        cwlPhase: 28,
        hole: "hub-svelte:arcgis-map",
        conversionStatus: "cwl-client-bundle-chartered",
        convertedBy: "G7804",
      };
    }
    if (id === "echarts-monitoring") {
      return {
        ...s,
        cwlPhase: 28,
        hole: "hub-svelte:chart-component",
        conversionStatus: "cwl-client-bundle-chartered",
        convertedBy: "G7804",
      };
    }
    return s;
  });
}

/** Cookie/header → session map for chimera preview (not production oracle). */
export function resolveWispPreviewSession(ctx) {
  const cookies = ctx.cookies ?? {};
  const auth = cookies.chrysalis_session ?? cookies.wisp_session ?? cookies.session;
  if (auth) {
    const email = String(auth).includes("@") ? String(auth) : "preview@wisptools.local";
    return {
      authenticated: true,
      userId: "preview-user",
      tenantId: cookies.wisp_tenant ?? "preview-tenant",
      email,
    };
  }
  return { authenticated: false };
}
