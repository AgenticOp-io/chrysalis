/** Deepen batch n10x — passes 233–242 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10x";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10x";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 233–242 — source-doc: portal KB/FAQ/alerts CRUD + chat-settings, branding PUT, port-order events, HW deployments, sites bulk-import (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 233, title: "Portal-content KB POST" },
  { id: 234, title: "Portal-content FAQ PUT" },
  { id: 235, title: "Portal-content alerts PUT" },
  { id: 236, title: "Portal-content chat-settings PUT" },
  { id: 237, title: "Branding PUT" },
  { id: 238, title: "Voice port-order events GET" },
  { id: 239, title: "Hardware-deployments list GET" },
  { id: 240, title: "Network sites bulk-import POST" },
  { id: 241, title: "Portal-content FAQ DELETE" },
  { id: 242, title: "Portal-content alerts DELETE" },
];

export const REFRESH_PATHS = [
  "/api/portal-content",
  "/api/branding",
  "/api/voice",
  "/api/network/hardware-deployments",
  "/api/network/sites",
];

export const SOURCE_REFS = [
  "backend-services/routes/portal-content.js",
  "backend-services/routes/branding-api.js",
  "backend-services/routes/voice-sip.js",
  "backend-services/routes/network.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 233 KB POST
  {
    probes.push({
      pass: 233,
      ...(await probeDemo("POST", `/api/portal-content/${tid}/knowledge-base`, {
        title: `CWL KB ${stamp}`,
        content: "chrysalis fidelity deepen",
        category: "Getting Started",
        published: true,
        tags: ["cwl"],
      })),
      source: "portal-content.js POST /:tenantId/knowledge-base",
    });
  }

  // 234 FAQ PUT
  {
    const faq = await firstIdDemo(`/api/portal-content/${tid}/faq`, []);
    if (!faq.id) probes.push({ pass: 234, action: "skip-no-faq" });
    else {
      probes.push({
        pass: 234,
        ...(await probeDemo("PUT", `/api/portal-content/${tid}/faq/${faq.id}`, {
          question: `Q upd ${stamp}`,
          answer: "A upd",
          category: "General",
          published: true,
        })),
        source: "portal-content.js PUT /:tenantId/faq/:faqId",
      });
    }
  }

  // 235 alerts PUT
  {
    const alert = await firstIdDemo(`/api/portal-content/${tid}/alerts`, []);
    if (!alert.id) probes.push({ pass: 235, action: "skip-no-alert" });
    else {
      probes.push({
        pass: 235,
        ...(await probeDemo("PUT", `/api/portal-content/${tid}/alerts/${alert.id}`, {
          title: `Alert upd ${stamp}`,
          message: "upd",
          type: "warning",
          status: "active",
        })),
        source: "portal-content.js PUT /:tenantId/alerts/:alertId",
      });
    }
  }

  // 236 chat-settings PUT
  {
    probes.push({
      pass: 236,
      ...(await probeDemo("PUT", `/api/portal-content/${tid}/chat-settings`, {
        enabled: true,
        greeting: `hi from cwl ${stamp}`,
      })),
      source: "portal-content.js PUT /:tenantId/chat-settings",
    });
  }

  // 237 branding PUT
  {
    probes.push({
      pass: 237,
      ...(await probeDemo("PUT", `/api/branding/${tid}`, {
        primaryColor: "#0ea5e9",
        companyName: "CWL Demo",
      })),
      source: "branding-api.js PUT /api/branding/:tenantId",
    });
  }

  // 238 port-order events
  {
    const po = await firstIdDemo("/api/voice/port-orders", []);
    if (!po.id) probes.push({ pass: 238, action: "skip-no-port-order" });
    else {
      probes.push({
        pass: 238,
        ...(await probeDemo("GET", `/api/voice/port-orders/${po.id}/events`)),
        source: "voice-sip.js GET /port-orders/:id/events",
      });
    }
  }

  probes.push({
    pass: 239,
    ...(await probeDemo("GET", "/api/network/hardware-deployments")),
    source: "network.js GET /hardware-deployments",
  });

  // 240 sites bulk-import
  {
    probes.push({
      pass: 240,
      ...(await probeDemo("POST", "/api/network/sites/bulk-import", {
        sites: [
          {
            name: `Bulk ${stamp}`,
            type: ["tower"],
            latitude: 39.74,
            longitude: -104.99,
          },
        ],
      })),
      source: "network.js POST /sites/bulk-import",
    });
  }

  // 241 FAQ create + DELETE
  {
    const created = await probeDemo("POST", `/api/portal-content/${tid}/faq`, {
      question: `del ${stamp}`,
      answer: "x",
      category: "General",
      published: false,
    });
    const fid = created.body?._id || created.body?.id;
    if (!fid) probes.push({ pass: 241, action: "skip-no-faq-create", created });
    else {
      probes.push({
        pass: 241,
        created,
        ...(await probeDemo("DELETE", `/api/portal-content/${tid}/faq/${fid}`)),
        source: "portal-content.js DELETE /:tenantId/faq/:faqId",
      });
    }
  }

  // 242 alerts create + DELETE
  {
    const created = await probeDemo("POST", `/api/portal-content/${tid}/alerts`, {
      title: `del ${stamp}`,
      message: "x",
      type: "info",
      status: "active",
    });
    const aid = created.body?._id || created.body?.id;
    if (!aid) probes.push({ pass: 242, action: "skip-no-alert-create", created });
    else {
      probes.push({
        pass: 242,
        created,
        ...(await probeDemo("DELETE", `/api/portal-content/${tid}/alerts/${aid}`)),
        source: "portal-content.js DELETE /:tenantId/alerts/:alertId",
      });
    }
  }

  return probes;
}
