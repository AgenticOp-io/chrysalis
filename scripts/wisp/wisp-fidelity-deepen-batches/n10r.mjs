/** Deepen batch n10r — passes 173–182 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10r";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10r";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 173–182 — source-doc: remote-agents status, voice lists, bundle type/search, inv stats, complaint PUT, branding GET (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 173, title: "Remote-agents status GET" },
  { id: 174, title: "Remote-agents status/unlinked GET" },
  { id: 175, title: "Voice provider-accounts GET" },
  { id: 176, title: "Voice telephone-numbers GET" },
  { id: 177, title: "Voice service-locations GET" },
  { id: 178, title: "Bundles by type GET" },
  { id: 179, title: "Bundles search GET" },
  { id: 180, title: "Inventory stats GET" },
  { id: 181, title: "Customers complaints PUT" },
  { id: 182, title: "Branding GET by tenant" },
];

export const REFRESH_PATHS = [
  "/api/remote-agents",
  "/api/voice",
  "/api/bundles",
  "/api/inventory",
  "/api/customers",
  "/api/branding",
];

export const SOURCE_REFS = [
  "backend-services/routes/remote-agents-status.js",
  "backend-services/routes/voice-sip.js",
  "backend-services/routes/hardwareBundles.js",
  "backend-services/models/hardwareBundle.js",
  "backend-services/routes/inventory.js",
  "backend-services/routes/customers.js",
  "backend-services/models/customer.js",
  "backend-services/routes/branding-api.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 173 remote agents status
  {
    probes.push({
      pass: 173,
      ...(await probeDemo("GET", "/api/remote-agents/status")),
      source: "remote-agents-status.js GET /status",
    });
  }

  // 174 unlinked
  {
    probes.push({
      pass: 174,
      ...(await probeDemo("GET", "/api/remote-agents/status/unlinked")),
      source: "remote-agents-status.js GET /status/unlinked",
    });
  }

  // 175–177 voice lists
  {
    probes.push({
      pass: 175,
      ...(await probeDemo("GET", "/api/voice/provider-accounts")),
      source: "voice-sip.js GET /provider-accounts",
    });
    probes.push({
      pass: 176,
      ...(await probeDemo("GET", "/api/voice/telephone-numbers")),
      source: "voice-sip.js GET /telephone-numbers",
    });
    probes.push({
      pass: 177,
      ...(await probeDemo("GET", "/api/voice/service-locations")),
      source: "voice-sip.js GET /service-locations",
    });
  }

  // 178 bundles by type (models/hardwareBundle.js enum)
  {
    probes.push({
      pass: 178,
      ...(await probeDemo("GET", "/api/bundles/type/standard")),
      source: "hardwareBundles.js GET /type/:bundleType",
    });
  }

  // 179 bundles search
  {
    probes.push({
      pass: 179,
      ...(await probeDemo("GET", `/api/bundles/search/${encodeURIComponent("radio")}`)),
      source: "hardwareBundles.js GET /search/:query",
    });
  }

  // 180 inventory stats
  {
    probes.push({
      pass: 180,
      ...(await probeDemo("GET", "/api/inventory/stats")),
      source: "inventory.js GET /stats",
    });
  }

  // 181 complaint create + PUT (customers.js + models/customer.js)
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    if (!cust.id) probes.push({ pass: 181, action: "skip-no-customer" });
    else {
      const created = await probeDemo("POST", `/api/customers/${cust.id}/complaints`, {
        category: "other",
        description: `chrysalis-n10r-${stamp}`,
        priority: "medium",
      });
      const complaints = Array.isArray(created.body?.complaints) ? created.body.complaints : [];
      const last = complaints[complaints.length - 1];
      const cid = String(last?._id || last?.id || "");
      if (!cid) {
        probes.push({
          pass: 181,
          created,
          ok: created.ok,
          action: "skip-no-complaint-id",
          source: "customers.js POST/PUT complaints",
        });
      } else {
        const upd = await probeDemo("PUT", `/api/customers/${cust.id}/complaints/${cid}`, {
          category: "other",
          description: `chrysalis-n10r-resolved-${stamp}`,
          priority: "low",
          status: "resolved",
          resolution: "fidelity-deepen",
        });
        probes.push({
          pass: 181,
          created,
          upd,
          ok: created.ok && upd.ok,
          source: "customers.js PUT /:id/complaints/:complaintId",
        });
      }
    }
  }

  // 182 branding GET
  {
    probes.push({
      pass: 182,
      ...(await probeDemo("GET", `/api/branding/${tid}`)),
      source: "branding-api.js GET /api/branding/:tenantId",
    });
  }

  return probes;
}
