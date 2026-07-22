/** Deepen batch n10h — passes 73–82 (probe body only). */
export const BATCH_ID = "n10h";
export const KIND = "chrysalis.wisp.fidelity-deepen-n10h";
export const NEED_ADMIN = false;
export const NOTE =
  "Deepen 73–82 — same HSS Mongo API; honest residuals for storage/discover timeouts";

export const PASSES = [
  { id: 73, title: "Inventory return (embedded returnLocation)" },
  { id: 74, title: "Inventory maintenance (type+date)" },
  { id: 75, title: "Install-doc PUT" },
  { id: 76, title: "Install-doc photos multipart" },
  { id: 77, title: "Plan marketing discover (boundingBox)" },
  { id: 78, title: "Incident notes" },
  { id: 79, title: "Work-order complete" },
  { id: 80, title: "Equipment-pricing create (radio schema)" },
  { id: 81, title: "HSS bandwidth-plans PUT existing" },
  { id: 82, title: "Monitoring graphs devices hydrate" },
];

export const REFRESH_PATHS = [
  "/api/inventory",
  "/api/installation-documentation",
  "/api/plans",
  "/api/incidents",
  "/api/work-orders",
  "/api/equipment-pricing",
  "/api/hss/bandwidth-plans",
  "/api/monitoring/graphs/devices",
];

export async function runProbes(ctx) {
  const { stamp, tenantId, demo, demoHeaders, probeDemo, firstIdDemo, probeAs } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];

  let inv = await firstIdDemo("/api/inventory", ["items", "inventory"]);
  if (inv.id) {
    await probeDemo("POST", `/api/inventory/${inv.id}/deploy`, {
      location: { type: "tower", name: "CWL Deploy" },
      notes: "chrysalis-n10h-redeploy",
    });
    inv = await firstIdDemo("/api/inventory", ["items", "inventory"]);
  }

  {
    if (!inv.id) probes.push({ pass: 73, action: "skip-no-inventory" });
    else {
      const ret = await probeDemo("POST", `/api/inventory/${inv.id}/return`, {
        returnLocation: { type: "warehouse", name: "Main Warehouse", id: "wh-main" },
        reason: "other",
        notes: "chrysalis-inventory-return",
      });
      probes.push({ pass: 73, ...ret });
    }
  }

  {
    inv = await firstIdDemo("/api/inventory", ["items", "inventory"]);
    if (!inv.id) probes.push({ pass: 74, action: "skip-no-inventory" });
    else {
      probes.push({
        pass: 74,
        ...(await probeDemo("POST", `/api/inventory/${inv.id}/maintenance`, {
          date: new Date().toISOString(),
          type: "inspection",
          notes: "chrysalis-inventory-maintenance",
          performedBy: "cwl-demo",
        })),
      });
    }
  }

  {
    const docs = await firstIdDemo("/api/installation-documentation", ["docs", "items"]);
    if (!docs.id) probes.push({ pass: 75, action: "skip-no-install-doc" });
    else {
      probes.push({
        pass: 75,
        ...(await probeDemo("PUT", `/api/installation-documentation/${docs.id}`, {
          installedByName: "CWL Tech",
          notes: `chrysalis-install-put-${stamp}`,
        })),
      });
    }
  }

  {
    const docs = await firstIdDemo("/api/installation-documentation", ["docs", "items"]);
    if (!docs.id) probes.push({ pass: 76, action: "skip-no-install-doc" });
    else {
      const fd = new FormData();
      const blob = new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
      fd.append("photos", blob, "cwl-a.jpg");
      fd.append("photos", blob, "cwl-b.jpg");
      fd.append("photos", blob, "cwl-c.jpg");
      const headers = { Accept: "application/json", "X-Tenant-ID": tenantId };
      if (demo.ok && demo.idToken) headers.Authorization = `Bearer ${demo.idToken}`;
      const photo = await probeAs(
        headers,
        "POST",
        `/api/installation-documentation/${docs.id}/photos`,
        fd,
        { rawBody: true },
      );
      probes.push({
        pass: 76,
        ...photo,
        note: photo.ok
          ? "ok"
          : String(photo.body?.message || "").includes("Bucket")
            ? "honest-hss-storage-bucket"
            : "honest-photos-gate",
      });
    }
  }

  {
    const plans = await firstIdDemo("/api/plans", ["plans", "items"]);
    if (!plans.id) probes.push({ pass: 77, action: "skip-no-plan" });
    else {
      const disc = await probeDemo(
        "POST",
        `/api/plans/${plans.id}/marketing/discover`,
        {
          planId: plans.id,
          boundingBox: { west: -105.1, south: 39.6, east: -104.8, north: 39.9 },
          options: { algorithms: ["microsoft_footprints", "osm_buildings"] },
        },
        { timeoutMs: 25_000 },
      );
      probes.push({
        pass: 77,
        ...disc,
        note: disc.ok
          ? "ok"
          : disc.error?.includes("aborted") || disc.status === 504
            ? "honest-timeout-504"
            : "honest-discover-or-fallback",
      });
    }
  }

  {
    const incs = await firstIdDemo("/api/incidents", ["incidents", "items"]);
    if (!incs.id) probes.push({ pass: 78, action: "skip-no-incident" });
    else {
      probes.push({
        pass: 78,
        ...(await probeDemo("POST", `/api/incidents/${incs.id}/notes`, {
          note: `chrysalis-inc-note-${stamp}`,
        })),
      });
    }
  }

  {
    const wos = await firstIdDemo("/api/work-orders", ["workOrders", "items"]);
    if (!wos.id) probes.push({ pass: 79, action: "skip-no-wo" });
    else {
      probes.push({
        pass: 79,
        ...(await probeDemo("POST", `/api/work-orders/${wos.id}/complete`, {
          resolution: "chrysalis-complete",
        })),
      });
    }
  }

  {
    const created = await probeDemo("POST", "/api/equipment-pricing", {
      category: "Radio Equipment",
      equipmentType: "radio",
      manufacturer: "Trace",
      model: `CWL-${stamp}`,
      basePrice: 99,
      currency: "USD",
      notes: "chrysalis-pricing",
    });
    let del = { action: "skip-no-id" };
    const pid = created.body?.pricing?._id || created.body?._id || created.body?.id;
    if (created.ok && pid) {
      del = await probeDemo("DELETE", `/api/equipment-pricing/${pid}`);
    }
    probes.push({ pass: 80, create: created, del });
  }

  {
    const created = await probeDemo("POST", "/api/hss/bandwidth-plans", {
      name: `CWL BW ${stamp}`,
      download_mbps: 100,
      upload_mbps: 20,
      description: "chrysalis-bw-plan",
    });
    let pid =
      created.body?.plan?.plan_id ||
      created.body?.plan?.id ||
      created.body?.plan_id ||
      created.body?.id;
    if (!pid) {
      const listed = await firstIdDemo("/api/hss/bandwidth-plans", ["plans"]);
      pid = listed.id || undefined;
    }
    let put = { action: "skip-no-id" };
    if (pid) {
      put = await probeDemo("PUT", `/api/hss/bandwidth-plans/${pid}`, {
        description: `chrysalis-bw-put-${stamp}`,
        download_mbps: 122,
      });
    }
    probes.push({
      pass: 81,
      create: created,
      put,
      note: created.ok ? "ok" : put.ok ? "honest-create-500-put-existing" : "honest-no-bw-plan",
    });
  }

  {
    probes.push({
      pass: 82,
      ...(await probeDemo("GET", "/api/monitoring/graphs/devices")),
    });
  }

  void demoHeaders;
  return probes;
}
