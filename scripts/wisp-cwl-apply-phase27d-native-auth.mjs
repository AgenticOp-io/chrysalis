#!/usr/bin/env node
/**
 * Phase 27d — native CWL auth + session on /login (retire hub-svelte:firebase-auth).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { replaceRouteHandlerBlock, routesPath, dedupeNativeAuthRouteHandlers } from "./wisp-cwl-apply-surfaces-lib.mjs";
import { reconcilePreviewFromRoutesCwl } from "./wisp-cwl-apply-module-routes-lib.mjs";
import { buildWispHoleManifest } from "./wisp-cwl-hole-manifest.mjs";

export const WISP_PHASE27D_NATIVE_AUTH_KIND = "chrysalis.wisp.phase27d-native-auth";

export const LOGIN_PAGE_BLOCK = `@page GET "/login"
page login_page {
  effects: session.read;
  content-type "text/html; charset=utf-8";
  use auth session;
  load { surface: "wisp-auth-native", source: "wisp-27d" };
  return ui {
    element "main" class "login-shell" {
      element "h1" { text "WISP Management"; }
      element "p" { text "Native CWL session auth (Phase 27d)"; }
      client ui {
        element "form" id "login-form" {
          element "label" { text "Email"; }
          element "input" id "email" type "email" { }
          element "label" { text "Password"; }
          element "input" id "password" type "password" { }
          element "button" id "sign-in" type "submit" {
            text "Sign in";
            on click { action "loginSubmit"; }
          }
        }
      }
    }
  };
}

@route POST "/login"
handler login_post {
  effects: session.write;
  use auth session;
  header X-Tenant-ID;
  body email;
  body password;
  return { ok: true, surface: "wisp-auth-native" };
}

@route GET "/api/me"
handler session_me {
  effects: session.read;
  use auth session;
  return { ok: true, surface: "wisp-auth-native" };
}`;

/**
 * @param {object} [opts]
 */
export function applyWispPhase27dNativeAuth(opts = {}) {
  const path = opts.routesPath ?? routesPath;
  if (!existsSync(path)) return { kind: WISP_PHASE27D_NATIVE_AUTH_KIND, schemaVersion: 1, ok: false, skip: "missing-routes-cwl" };

  let text = readFileSync(path, "utf8");
  const deduped = dedupeNativeAuthRouteHandlers(text);
  text = deduped.text;
  const alreadyNative =
    text.includes("wisp-auth-native") &&
    !text.includes("hub-svelte:firebase-auth") &&
    deduped.loginPostCount === 1 &&
    deduped.sessionMeCount === 1;

  if (!alreadyNative) {
    const applied = replaceRouteHandlerBlock(text, [`@route GET "/login"`, `@page GET "/login"`], LOGIN_PAGE_BLOCK);
    if (!applied.ok) return { kind: WISP_PHASE27D_NATIVE_AUTH_KIND, schemaVersion: 1, ok: false, skip: applied.skip };
    text = applied.text;
    text = text.replace(/hub-svelte:firebase-auth/g, "cwl-auth-native");
    const afterApply = dedupeNativeAuthRouteHandlers(text);
    text = afterApply.text;
  }

  writeFileSync(path, text, "utf8");

  const preview = reconcilePreviewFromRoutesCwl();
  const holeManifest = buildWispHoleManifest();
  const firebaseHoles = holeManifest.byReason?.["hub-svelte:firebase-auth"] ?? 0;

  return {
    kind: WISP_PHASE27D_NATIVE_AUTH_KIND,
    schemaVersion: 1,
    ok: firebaseHoles === 0 && !text.includes("hole hub-svelte:firebase-auth"),
    firebaseHoles,
    preview,
    holeManifest,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = applyWispPhase27dNativeAuth();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("wisp-cwl-apply-phase27d-native-auth")) main();
