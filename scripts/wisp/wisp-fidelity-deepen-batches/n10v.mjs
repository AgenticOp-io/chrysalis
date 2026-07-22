/** Deepen batch n10v — passes 213–222 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10v";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10v";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 213–222 — source-doc: portal KB published, epc list, pricing/bundles/tenant-settings/notifications lists, permissions check, voice TN+emergency POST, mobile tasks (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 213, title: "Portal-content KB published GET" },
  { id: 214, title: "EPC list GET" },
  { id: 215, title: "Equipment-pricing list GET" },
  { id: 216, title: "Bundles list GET" },
  { id: 217, title: "Tenant-settings GET" },
  { id: 218, title: "Notifications list GET" },
  { id: 219, title: "Permissions check GET" },
  { id: 220, title: "Voice telephone-numbers POST" },
  { id: 221, title: "Voice emergency-addresses POST" },
  { id: 222, title: "Mobile tasks GET" },
];

export const REFRESH_PATHS = [
  "/api/portal-content",
  "/api/epc",
  "/api/equipment-pricing",
  "/api/bundles",
  "/api/tenant-settings",
  "/api/notifications",
  "/api/permissions",
  "/api/voice",
  "/api/mobile",
];

export const SOURCE_REFS = [
  "backend-services/routes/portal-content.js",
  "backend-services/routes/epc.js",
  "backend-services/routes/equipment-pricing.js",
  "backend-services/routes/hardwareBundles.js",
  "backend-services/routes/tenant-settings.js",
  "backend-services/routes/notifications.js",
  "backend-services/routes/permissions.js",
  "backend-services/routes/voice-sip.js",
  "backend-services/routes/mobile-tasks.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  probes.push({
    pass: 213,
    ...(await probeDemo("GET", `/api/portal-content/${tid}/knowledge-base/published`)),
    source: "portal-content.js GET /:tenantId/knowledge-base/published",
  });

  probes.push({
    pass: 214,
    ...(await probeDemo("GET", "/api/epc/list")),
    source: "epc.js GET /list",
  });

  probes.push({
    pass: 215,
    ...(await probeDemo("GET", "/api/equipment-pricing")),
    source: "equipment-pricing.js GET /",
  });

  probes.push({
    pass: 216,
    ...(await probeDemo("GET", "/api/bundles")),
    source: "hardwareBundles.js GET /",
  });

  probes.push({
    pass: 217,
    ...(await probeDemo("GET", "/api/tenant-settings")),
    source: "tenant-settings.js GET /",
  });

  probes.push({
    pass: 218,
    ...(await probeDemo("GET", "/api/notifications")),
    source: "notifications.js GET /",
  });

  probes.push({
    pass: 219,
    ...(await probeDemo(
      "GET",
      "/api/permissions/check?module=customers&fcapsCategory=fault&operation=read",
    )),
    source: "permissions.js GET /check (module+fcapsCategory+operation)",
  });

  // 220 telephone number — needs provider account (voice-sip.js)
  {
    const acct = await firstIdDemo("/api/voice/provider-accounts", []);
    if (!acct.id) probes.push({ pass: 220, action: "skip-no-provider-account" });
    else {
      probes.push({
        pass: 220,
        ...(await probeDemo("POST", "/api/voice/telephone-numbers", {
          e164: `+1303${String(stamp).slice(-7)}`,
          status: "inventory",
          voiceProviderAccountId: acct.id,
        })),
        source: "voice-sip.js POST /telephone-numbers",
      });
    }
  }

  // 221 emergency address — needs service location + provider account
  {
    const acct = await firstIdDemo("/api/voice/provider-accounts", []);
    const loc = await firstIdDemo("/api/voice/service-locations", []);
    if (!acct.id || !loc.id) {
      probes.push({ pass: 221, action: "skip-missing-voice-deps", acctId: acct.id, locId: loc.id });
    } else {
      probes.push({
        pass: 221,
        ...(await probeDemo("POST", "/api/voice/emergency-addresses", {
          serviceLocationId: loc.id,
          voiceProviderAccountId: acct.id,
          validationStatus: "pending",
        })),
        source: "voice-sip.js POST /emergency-addresses",
      });
    }
  }

  probes.push({
    pass: 222,
    ...(await probeDemo("GET", "/api/mobile/tasks")),
    source: "mobile-tasks.js GET /tasks (or mount /api/mobile)",
  });

  return probes;
}
