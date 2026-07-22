/** Deepen batch n10o — passes 143–152 (desk harness; bodies from backend-services). */
export const BATCH_ID = "n10o";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10o";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 143–152 — source-doc: plan req del/feature PATCH/missing-hw, bundle items+category, CPE/equip ownership, inv alerts/location, HSS group cycle, pricing /price (D6442)";

export const DEMO_EMAIL = "demo@wisptools.io";

export const PASSES = [
  { id: 143, title: "Plans requirements POST+DELETE index" },
  { id: 144, title: "Plans feature PATCH" },
  { id: 145, title: "Plans missing-hardware GET" },
  { id: 146, title: "Bundle items category+DELETE" },
  { id: 147, title: "Equipment create+PUT (createdBy)" },
  { id: 148, title: "CPE create+PUT (createdBy/X-User-Email)" },
  { id: 149, title: "Inventory alerts low-stock GET" },
  { id: 150, title: "Inventory by-location GET" },
  { id: 151, title: "HSS groups create+PUT+DELETE" },
  { id: 152, title: "Equipment-pricing GET /price" },
];

export const REFRESH_PATHS = [
  "/api/plans",
  "/api/bundles",
  "/api/network/equipment",
  "/api/network/cpe",
  "/api/inventory",
  "/api/hss/groups",
  "/api/equipment-pricing",
];

export const SOURCE_REFS = [
  "backend-services/routes/plans/plans-hardware.js",
  "backend-services/routes/plans/plans-features.js",
  "backend-services/routes/hardwareBundles.js",
  "backend-services/models/hardwareBundle.js",
  "backend-services/routes/network.js",
  "backend-services/routes/inventory.js",
  "backend-services/routes/hss/hss-groups.js",
  "backend-services/routes/equipment-pricing.js",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 143 requirements POST + DELETE 0 (plans-hardware.js)
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `ReqDel ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const pid = created.body?._id;
    if (!pid) probes.push({ pass: 143, action: "skip-no-plan", created });
    else {
      const add = await probeDemo("POST", `/api/plans/${pid}/requirements`, {
        category: "Radio Equipment",
        equipmentType: "radio",
        quantity: 1,
        notes: `chrysalis-n10o-${stamp}`,
      });
      const del = await probeDemo("DELETE", `/api/plans/${pid}/requirements/0`);
      probes.push({
        pass: 143,
        created,
        add,
        del,
        ok: created.ok && add.ok && del.ok,
        source: "plans-hardware.js",
      });
    }
  }

  // 144 feature PATCH (plans-features.js)
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `FeatP ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const pid = created.body?._id;
    if (!pid) probes.push({ pass: 144, action: "skip-no-plan", created });
    else {
      const feat = await probeDemo("POST", `/api/plans/${pid}/features`, {
        featureType: "sector",
        name: `FP ${stamp}`,
        geometry: { type: "Point", coordinates: [-104.99, 39.74] },
        status: "draft",
      });
      const fid = feat.body?.feature?._id || feat.body?.feature?.id;
      if (!fid) probes.push({ pass: 144, action: "skip-no-feature", created, feat });
      else {
        const patch = await probeDemo("PATCH", `/api/plans/${pid}/features/${fid}`, {
          status: "draft",
          properties: { name: `FP-patched-${stamp}`, notes: `chrysalis-n10o-${stamp}` },
        });
        probes.push({
          pass: 144,
          created,
          feat,
          patch,
          ok: created.ok && feat.ok && patch.ok,
          source: "plans-features.js",
        });
      }
    }
  }

  // 145 missing-hardware GET (plans-hardware.js)
  {
    const created = await probeDemo("POST", "/api/plans", {
      name: `Miss ${stamp}`,
      status: "draft",
      kind: "plan-project",
    });
    const pid = created.body?._id;
    if (!pid) probes.push({ pass: 145, action: "skip-no-plan", created });
    else {
      await probeDemo("POST", `/api/plans/${pid}/requirements`, {
        category: "Radio Equipment",
        equipmentType: "radio",
        quantity: 2,
      });
      await probeDemo("POST", `/api/plans/${pid}/analyze`, {});
      const miss = await probeDemo("GET", `/api/plans/${pid}/missing-hardware`);
      probes.push({
        pass: 145,
        created,
        miss,
        ok: created.ok && miss.ok,
        source: "plans-hardware.js GET missing-hardware",
      });
    }
  }

  // 146 bundle items — models/hardwareBundle.js category enum
  {
    const bun = await probeDemo("POST", "/api/bundles", {
      name: `BI ${stamp}`,
      category: "installation",
      description: "chrysalis-n10o",
    });
    const bid = bun.body?._id;
    if (!bid) probes.push({ pass: 146, action: "skip-no-bundle", bun });
    else {
      const add = await probeDemo("POST", `/api/bundles/${bid}/items`, {
        category: "Radio Equipment",
        equipmentType: "radio",
        quantity: 1,
        name: `Radio ${stamp}`,
      });
      const items = add.body?.bundle?.items || add.body?.items || [];
      const iid = items[items.length - 1]?._id || add.body?.item?._id;
      let del = { ok: false, action: "skip-no-item-id" };
      if (iid) del = await probeDemo("DELETE", `/api/bundles/${bid}/items/${iid}`);
      probes.push({
        pass: 146,
        bun,
        add,
        del,
        ok: bun.ok && add.ok && del.ok,
        source: "hardwareBundles.js + hardwareBundle.js",
      });
    }
  }

  // 147 equipment create+PUT with createdBy (network.js)
  {
    const created = await probeDemo("POST", "/api/network/equipment", {
      name: `OwnE ${stamp}`,
      type: "radio",
      serialNumber: `OE-${stamp}`,
      manufacturer: "CWL",
      model: "M",
      status: "active",
      createdBy: DEMO_EMAIL,
      email: DEMO_EMAIL,
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 147, action: "skip-no-equip", created });
    else {
      const put = await probeDemo("PUT", `/api/network/equipment/${id}`, {
        notes: `chrysalis-n10o-${stamp}`,
        email: DEMO_EMAIL,
        createdBy: DEMO_EMAIL,
      });
      probes.push({
        pass: 147,
        created,
        put,
        ok: created.ok && put.ok,
        source: "network.js equipment ownership",
      });
    }
  }

  // 148 CPE create+PUT with createdBy + email (network.js)
  {
    const created = await probeDemo("POST", "/api/network/cpe", {
      name: `OwnCPE ${stamp}`,
      serialNumber: `OCPE-${stamp}`,
      macAddress: "00:11:22:33:55:99",
      manufacturer: "CWL",
      model: "CPE",
      technology: "LTE",
      serviceType: "residential",
      status: "active",
      location: { latitude: 39.7, longitude: -104.9 },
      azimuth: 0,
      beamwidth: 60,
      createdBy: DEMO_EMAIL,
      email: DEMO_EMAIL,
    });
    const id = created.body?._id;
    if (!id) probes.push({ pass: 148, action: "skip-no-cpe", created });
    else {
      const put = await probeDemo("PUT", `/api/network/cpe/${id}`, {
        notes: `chrysalis-n10o-${stamp}`,
        email: DEMO_EMAIL,
      });
      probes.push({
        pass: 148,
        created,
        put,
        ok: created.ok && put.ok,
        source: "network.js CPE ownership",
      });
    }
  }

  // 149 inventory alerts (inventory.js)
  {
    probes.push({
      pass: 149,
      ...(await probeDemo("GET", "/api/inventory/alerts/low-stock")),
      source: "inventory.js",
    });
  }

  // 150 by-location (inventory.js)
  {
    probes.push({
      pass: 150,
      ...(await probeDemo("GET", "/api/inventory/by-location/warehouse")),
      source: "inventory.js",
    });
  }

  // 151 HSS groups cycle (hss-groups.js)
  {
    const created = await probeDemo("POST", "/api/hss/groups", {
      name: `G ${stamp}`,
      description: "chrysalis-n10o",
      default_apn: "internet",
      default_qci: 9,
    });
    const gid = created.body?.group?.id || created.body?.group?.group_id || created.body?.id;
    if (!gid) probes.push({ pass: 151, action: "skip-no-group", created });
    else {
      const put = await probeDemo("PUT", `/api/hss/groups/${gid}`, {
        description: `upd-${stamp}`,
      });
      const del = await probeDemo("DELETE", `/api/hss/groups/${gid}`);
      probes.push({
        pass: 151,
        created,
        put,
        del,
        ok: created.ok && put.ok && del.ok,
        source: "hss-groups.js",
      });
    }
  }

  // 152 pricing GET /price (equipment-pricing.js)
  {
    const q = new URLSearchParams({
      category: "Radio Equipment",
      equipmentType: "Radio",
      manufacturer: "CWL",
    });
    probes.push({
      pass: 152,
      ...(await probeDemo("GET", `/api/equipment-pricing/price?${q}`)),
      source: "equipment-pricing.js GET /price",
    });
  }

  return probes;
}
