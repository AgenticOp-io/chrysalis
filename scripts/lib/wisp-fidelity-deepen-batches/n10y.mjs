/** Deepen batch n10y — passes 243–252 (desk harness; uses D6445 external-deps briefing). */
export const BATCH_ID = "n10y";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10y";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 243–252 — external-deps first (D6445): skip inventing ArcGIS/SendGrid/Gemini keys; portal KB CRUD, HD PUT, equip bulk, inv by-location, site/CPE/WO GET :id, geocode (HSS may use nominatim when ARCGIS_API_KEY unset)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const EXTERNAL_DEPS_NOTES = [
  "Local deepen host missing PUBLIC_ARCGIS_API_KEY / ARCGIS_API_KEY — geocode still probed for HSS parity (source falls back to Nominatim).",
  "SENDGRID_API_KEY / SMTP_PASS / PUBLIC_GEMINI_API_KEY / STRIPE_SECRET_KEY / PAYPAL_CLIENT_SECRET missing locally — not exercised this batch.",
  "SNMP/MikroTik hardware credentials are device-scoped — list GETs only (already closed earlier).",
];

export const PASSES = [
  { id: 243, title: "Portal-content KB GET by id" },
  { id: 244, title: "Portal-content KB PUT" },
  { id: 245, title: "Portal-content KB DELETE" },
  { id: 246, title: "Hardware-deployments PUT" },
  { id: 247, title: "Network equipment bulk-import POST" },
  { id: 248, title: "Inventory by-location warehouse GET" },
  { id: 249, title: "Network site GET by id" },
  { id: 250, title: "Network CPE GET by id" },
  { id: 251, title: "Work-order GET by id" },
  { id: 252, title: "Network geocode POST (ArcGIS key risk)" },
];

export const REFRESH_PATHS = [
  "/api/portal-content",
  "/api/network/hardware-deployments",
  "/api/network/equipment",
  "/api/inventory",
  "/api/network/sites",
  "/api/network/cpe",
  "/api/work-orders",
  "/api/network/geocode",
];

export const SOURCE_REFS = [
  "backend-services/routes/portal-content.js",
  "backend-services/routes/network.js",
  "backend-services/routes/inventory.js",
  "backend-services/routes/work-orders.js",
  "fixtures/hub-wisp-management/chrysalis.wisp-external-deps.v1.json",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 243–244 KB get + put
  {
    const kb = await firstIdDemo(`/api/portal-content/${tid}/knowledge-base`, []);
    if (!kb.id) probes.push({ pass: 243, action: "skip-no-kb" }, { pass: 244, action: "skip-no-kb" });
    else {
      probes.push({
        pass: 243,
        ...(await probeDemo("GET", `/api/portal-content/${tid}/knowledge-base/${kb.id}`)),
        source: "portal-content.js GET /:tenantId/knowledge-base/:articleId",
      });
      probes.push({
        pass: 244,
        ...(await probeDemo("PUT", `/api/portal-content/${tid}/knowledge-base/${kb.id}`, {
          title: `KB n10y ${stamp}`,
          content: "chrysalis fidelity deepen",
          category: "Getting Started",
          published: true,
        })),
        source: "portal-content.js PUT /:tenantId/knowledge-base/:articleId",
      });
    }
  }

  // 245 KB create + DELETE
  {
    const created = await probeDemo("POST", `/api/portal-content/${tid}/knowledge-base`, {
      title: `del ${stamp}`,
      content: "x",
      category: "Getting Started",
      published: false,
    });
    const kid = created.body?._id || created.body?.id;
    if (!kid) probes.push({ pass: 245, action: "skip-no-kb-create", created });
    else {
      probes.push({
        pass: 245,
        created,
        ...(await probeDemo("DELETE", `/api/portal-content/${tid}/knowledge-base/${kid}`)),
        source: "portal-content.js DELETE /:tenantId/knowledge-base/:articleId",
      });
    }
  }

  // 246 HD PUT
  {
    const hd = await firstIdDemo("/api/network/hardware-deployments", []);
    if (!hd.id) probes.push({ pass: 246, action: "skip-no-hd" });
    else {
      probes.push({
        pass: 246,
        ...(await probeDemo("PUT", `/api/network/hardware-deployments/${hd.id}`, {
          status: "deployed",
          name: `HW n10y ${stamp}`,
        })),
        source: "network.js PUT /hardware-deployments/:id",
      });
    }
  }

  // 247 equipment bulk-import
  {
    probes.push({
      pass: 247,
      ...(await probeDemo("POST", "/api/network/equipment/bulk-import", {
        equipment: [
          {
            name: `Eq ${stamp}`,
            type: "router",
            status: "active",
            createdBy: "cwl-demo",
            email: "demo@wisptools.io",
          },
        ],
      })),
      source: "network.js POST /equipment/bulk-import",
    });
  }

  probes.push({
    pass: 248,
    ...(await probeDemo("GET", "/api/inventory/by-location/warehouse")),
    source: "inventory.js GET /by-location/:locationType",
  });

  // 249–251 GET by id
  {
    const site = await firstIdDemo("/api/network/sites", ["sites", "items"]);
    if (!site.id) probes.push({ pass: 249, action: "skip-no-site" });
    else {
      probes.push({
        pass: 249,
        ...(await probeDemo("GET", `/api/network/sites/${site.id}`)),
        source: "network.js GET /sites/:id",
      });
    }
    const cpe = await firstIdDemo("/api/network/cpe", []);
    if (!cpe.id) probes.push({ pass: 250, action: "skip-no-cpe" });
    else {
      probes.push({
        pass: 250,
        ...(await probeDemo("GET", `/api/network/cpe/${cpe.id}`)),
        source: "network.js GET /cpe/:id",
      });
    }
    const wo = await firstIdDemo("/api/work-orders", []);
    if (!wo.id) probes.push({ pass: 251, action: "skip-no-wo" });
    else {
      probes.push({
        pass: 251,
        ...(await probeDemo("GET", `/api/work-orders/${wo.id}`)),
        source: "work-orders.js GET /:id",
      });
    }
  }

  // 252 geocode — D6445: ArcGIS keys missing locally; source uses Nominatim fallback
  {
    probes.push({
      pass: 252,
      ...(await probeDemo("POST", "/api/network/geocode", {
        address: "1600 Amphitheatre Parkway, Mountain View, CA",
      })),
      externalRisk: "ARCGIS_API_KEY / PUBLIC_ARCGIS_API_KEY missing on deepen host",
      source: "network.js POST /geocode (ArcGIS token optional; Nominatim fallback)",
    });
  }

  return probes;
}
