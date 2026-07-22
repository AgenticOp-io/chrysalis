/** Deepen batch n10i — passes 83–92 (probe body only; desk harness). */
export const BATCH_ID = "n10i";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10i";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 83–92 — desk candidates probe queue; same HSS Mongo API (D6442)";

export const PASSES = [
  { id: 83, title: "Notifications PUT /:id/read + count" },
  { id: 84, title: "Tenant-settings ACS PUT" },
  { id: 85, title: "HSS groups PUT existing" },
  { id: 86, title: "Plans PUT notes" },
  { id: 87, title: "Plans analyze POST" },
  { id: 88, title: "Plans features POST (featureType sector)" },
  { id: 89, title: "Bundle PUT description" },
  { id: 90, title: "Bundle items POST (equipmentType radio)" },
  { id: 91, title: "Customers PUT + CPE PUT" },
  { id: 92, title: "Network equipment create+PUT (type required)" },
];

export const REFRESH_PATHS = [
  "/api/notifications",
  "/api/tenant-settings",
  "/api/hss/groups",
  "/api/plans",
  "/api/bundles",
  "/api/customers",
  "/api/network/cpe",
  "/api/network/equipment",
];

export async function runProbes(ctx) {
  const { stamp, probeDemo, firstIdDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  // 83 notifications mark-read
  {
    const list = await firstIdDemo("/api/notifications", ["notifications", "items"]);
    const nid = list.row?.id || list.id;
    if (!nid) probes.push({ pass: 83, action: "skip-no-notification" });
    else {
      const read = await probeDemo("PUT", `/api/notifications/${nid}/read`, {});
      const count = await probeDemo("GET", "/api/notifications/count");
      probes.push({
        pass: 83,
        read,
        count,
        note: read.ok ? "ok" : "honest-mark-read",
      });
    }
  }

  // 84 tenant-settings ACS
  {
    const cur = await probeDemo("GET", "/api/tenant-settings");
    const body = cur.body && typeof cur.body === "object" ? cur.body : {};
    const put = await probeDemo("PUT", "/api/tenant-settings", {
      ...body,
      acsSettings: {
        ...(body.acsSettings || {}),
        username: "cwl-acs",
        url: "https://acs.example.com",
      },
    });
    probes.push({ pass: 84, get: cur, put });
  }

  // 85 HSS groups PUT
  {
    let listed = await firstIdDemo("/api/hss/groups", ["groups"]);
    if (!listed.id) {
      const created = await probeDemo("POST", "/api/hss/groups", {
        name: `CWL Group ${stamp}`,
        description: "chrysalis-hss-group",
        default_apn: "internet",
        default_qci: 9,
      });
      listed = {
        id:
          created.body?.group?.group_id ||
          created.body?.group?.id ||
          created.body?.group_id ||
          "",
      };
    }
    if (!listed.id) probes.push({ pass: 85, action: "skip-no-group" });
    else {
      probes.push({
        pass: 85,
        ...(await probeDemo("PUT", `/api/hss/groups/${listed.id}`, {
          description: `chrysalis-group-put-${stamp}`,
        })),
      });
    }
  }

  // 86–88 plans
  {
    const plans = await firstIdDemo("/api/plans", ["plans", "items"]);
    if (!plans.id) {
      probes.push({ pass: 86, action: "skip-no-plan" });
      probes.push({ pass: 87, action: "skip-no-plan" });
      probes.push({ pass: 88, action: "skip-no-plan" });
    } else {
      probes.push({
        pass: 86,
        ...(await probeDemo("PUT", `/api/plans/${plans.id}`, {
          notes: `chrysalis-plan-put-${stamp}`,
        })),
      });
      probes.push({
        pass: 87,
        ...(await probeDemo("POST", `/api/plans/${plans.id}/analyze`, {
          notes: "chrysalis-plan-analyze",
        })),
      });
      probes.push({
        pass: 88,
        ...(await probeDemo("POST", `/api/plans/${plans.id}/features`, {
          featureType: "sector",
          geometry: { type: "Point", coordinates: [-104.99, 39.74] },
          properties: { name: `CWL Feature ${stamp}` },
          status: "draft",
          notes: "chrysalis-plan-feature",
        })),
      });
    }
  }

  // 89–90 bundles
  {
    const bundles = await firstIdDemo("/api/bundles", ["bundles", "items"]);
    if (!bundles.id) {
      probes.push({ pass: 89, action: "skip-no-bundle" });
      probes.push({ pass: 90, action: "skip-no-bundle" });
    } else {
      probes.push({
        pass: 89,
        ...(await probeDemo("PUT", `/api/bundles/${bundles.id}`, {
          description: `chrysalis-bundle-${stamp}`,
        })),
      });
      probes.push({
        pass: 90,
        ...(await probeDemo("POST", `/api/bundles/${bundles.id}/items`, {
          name: "CWL Bundle Item",
          quantity: 1,
          category: "Radio Equipment",
          equipmentType: "radio",
          notes: "chrysalis-bundle-item",
        })),
      });
    }
  }

  // 91 customers PUT + CPE PUT
  {
    const cust = await firstIdDemo("/api/customers", ["customers", "items"]);
    const cpe = await firstIdDemo("/api/network/cpe", ["cpe", "items"]);
    const custPut = cust.id
      ? await probeDemo("PUT", `/api/customers/${cust.id}`, {
          notes: `chrysalis-cust-${stamp}`,
        })
      : { action: "skip-no-customer" };
    const cpePut = cpe.id
      ? await probeDemo("PUT", `/api/network/cpe/${cpe.id}`, {
          notes: `chrysalis-cpe-${stamp}`,
          name: cpe.row?.name || "CWL CPE",
        })
      : { action: "skip-no-cpe" };
    probes.push({
      pass: 91,
      customer: custPut,
      cpe: cpePut,
      note: custPut.ok && cpePut.ok ? "ok" : "partial",
    });
  }

  // 92 equipment create + PUT (type required)
  {
    const created = await probeDemo("POST", "/api/network/equipment", {
      name: `CWL Eq ${stamp}`,
      type: "radio",
      equipmentType: "radio",
      manufacturer: "CWL",
      model: "M1",
      serialNumber: `EQ-${stamp}`,
      status: "active",
      location: { latitude: 39.75, longitude: -104.98 },
    });
    const id = created.body?._id || created.body?.id;
    let put = { action: "skip-no-id" };
    let del = { action: "skip-no-id" };
    if (created.ok && id) {
      put = await probeDemo("PUT", `/api/network/equipment/${id}`, {
        notes: `chrysalis-eq-put-${stamp}`,
      });
      del = await probeDemo("DELETE", `/api/network/equipment/${id}`);
    }
    probes.push({
      pass: 92,
      create: created,
      put,
      del,
      note: created.ok && put.ok ? "ok" : "honest-equip-schema",
    });
  }

  return probes;
}
