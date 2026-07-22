/** Deepen batch n10w — passes 223–232 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10w";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10w";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 223–232 — source-doc: voice TN PATCH + port-order POST, install-doc GET :id, portal FAQ/alerts POST, pricing create+DELETE, HSS group/BW/subscribers GET (D6442)";

export const DEMO_TENANT = "6a166eb07089304417ec967a";

export const PASSES = [
  { id: 223, title: "Voice telephone-numbers PATCH" },
  { id: 224, title: "Installation-documentation GET by id" },
  { id: 225, title: "Portal-content FAQ POST" },
  { id: 226, title: "Portal-content alerts POST" },
  { id: 227, title: "Equipment-pricing create POST" },
  { id: 228, title: "Equipment-pricing DELETE" },
  { id: 229, title: "Voice port-orders POST" },
  { id: 230, title: "HSS groups GET by id" },
  { id: 231, title: "HSS bandwidth-plans list GET" },
  { id: 232, title: "HSS subscribers list GET" },
];

export const REFRESH_PATHS = [
  "/api/voice",
  "/api/installation-documentation",
  "/api/portal-content",
  "/api/equipment-pricing",
  "/api/hss/groups",
  "/api/hss/bandwidth-plans",
  "/api/hss/subscribers",
];

export const SOURCE_REFS = [
  "backend-services/routes/voice-sip.js",
  "backend-services/routes/installation-documentation.js",
  "backend-services/routes/portal-content.js",
  "backend-services/routes/equipment-pricing.js",
  "backend-services/routes/hss/hss-groups.js",
  "backend-services/routes/hss/hss-bandwidth-plans.js",
  "backend-services/routes/hss/hss-subscribers.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo, tenantId } = ctx;
  const tid = tenantId || DEMO_TENANT;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 223 TN PATCH
  {
    const tn = await firstIdDemo("/api/voice/telephone-numbers", []);
    if (!tn.id) probes.push({ pass: 223, action: "skip-no-tn" });
    else {
      probes.push({
        pass: 223,
        ...(await probeDemo("PATCH", `/api/voice/telephone-numbers/${tn.id}`, {
          status: "inventory",
          rateCenter: `cwl-${stamp}`,
        })),
        source: "voice-sip.js PATCH /telephone-numbers/:id",
      });
    }
  }

  // 224 install-doc by id
  {
    const doc = await firstIdDemo("/api/installation-documentation", []);
    if (!doc.id) probes.push({ pass: 224, action: "skip-no-install-doc" });
    else {
      probes.push({
        pass: 224,
        ...(await probeDemo("GET", `/api/installation-documentation/${doc.id}`)),
        source: "installation-documentation.js GET /:id",
      });
    }
  }

  // 225 FAQ POST
  {
    probes.push({
      pass: 225,
      ...(await probeDemo("POST", `/api/portal-content/${tid}/faq`, {
        question: `CWL Q ${stamp}`,
        answer: "chrysalis fidelity deepen",
        category: "General",
        published: true,
      })),
      source: "portal-content.js POST /:tenantId/faq",
    });
  }

  // 226 alerts POST
  {
    probes.push({
      pass: 226,
      ...(await probeDemo("POST", `/api/portal-content/${tid}/alerts`, {
        title: `CWL Alert ${stamp}`,
        message: "chrysalis fidelity deepen",
        type: "info",
        status: "active",
      })),
      source: "portal-content.js POST /:tenantId/alerts",
    });
  }

  // 227–228 pricing create + delete
  {
    const created = await probeDemo("POST", "/api/equipment-pricing", {
      category: "Radio Equipment",
      equipmentType: "radio",
      manufacturer: "CWL",
      model: `n10w-${stamp}`,
      basePrice: 99,
      currency: "USD",
      source: "manual",
      notes: `chrysalis-n10w-${stamp}`,
    });
    const pid =
      created.body?.pricing?._id ||
      created.body?.pricing?.id ||
      created.body?._id ||
      created.body?.id;
    probes.push({
      pass: 227,
      ...created,
      ok: created.ok,
      source: "equipment-pricing.js POST /",
    });
    if (!pid) probes.push({ pass: 228, action: "skip-no-pricing-id", created });
    else {
      probes.push({
        pass: 228,
        ...(await probeDemo("DELETE", `/api/equipment-pricing/${pid}`)),
        source: "equipment-pricing.js DELETE /:id",
      });
    }
  }

  // 229 port-orders POST
  {
    probes.push({
      pass: 229,
      ...(await probeDemo("POST", "/api/voice/port-orders", {
        externalOrderId: `po-${stamp}`,
        status: "draft",
      })),
      source: "voice-sip.js POST /port-orders",
    });
  }

  // 230 HSS group by id
  {
    const g = await firstIdDemo("/api/hss/groups", ["groups"]);
    const gid = g.id || g.row?.group_id || "";
    if (!gid) probes.push({ pass: 230, action: "skip-no-group" });
    else {
      probes.push({
        pass: 230,
        ...(await probeDemo("GET", `/api/hss/groups/${gid}`)),
        source: "hss-groups.js GET /groups/:group_id",
      });
    }
  }

  probes.push({
    pass: 231,
    ...(await probeDemo("GET", "/api/hss/bandwidth-plans")),
    source: "hss-bandwidth-plans.js GET list",
  });

  probes.push({
    pass: 232,
    ...(await probeDemo("GET", "/api/hss/subscribers")),
    source: "hss-subscribers.js GET list",
  });

  return probes;
}
