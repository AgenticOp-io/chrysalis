import { mkdtempSync, readFileSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { readCorpus } from "@chrysalis/oracle";
import {
  bindSiteProjectLoadFromTraces,
  bindTracedLoadToCwlSource,
  hydrateDemoHtmlFromApiBody,
  hydrateStructuralHtmlFromApiBody,
  indexTracedApiResponses,
  parseEachHeader,
  evaluateIfDetail,
  resolveInterpDetail,
  resolveJsonPath,
  seedApiPathsIntoCwlSource,
  tracedApiLoadFields,
} from "../src/site-load-bind.js";
import { inferUiPageApiPath } from "../src/infer-ui-page-api-path.js";

const fixtureRoot = join(import.meta.dirname, "../../../fixtures/site-load-bind");

describe("site-load-bind (G9430)", () => {
  test("indexes traced GET /api/admin from fixture corpus", () => {
    const corpus = readCorpus({ root: join(fixtureRoot, "traces") });
    const index = indexTracedApiResponses(corpus);
    const binding = index.get("GET /api/admin");
    expect(binding).toBeDefined();
    expect(binding?.status).toBe(200);
    const body = binding?.body as { stats?: { activeRecords?: number } };
    expect(body.stats?.activeRecords).toBe(42);
  });

  test("tracedApiLoadFields flattens stats scalars", () => {
    const fields = tracedApiLoadFields({
      ok: true,
      stats: { activeRecords: 42, openAlerts: 3, pendingTasks: 7 },
      items: [{ id: "1" }],
    });
    expect(fields.activeRecords).toBe("42");
    expect(fields.itemCount).toBe("1");
    expect(fields.api_ok).toBe("true");
  });

  test("hydrateDemoHtmlFromApiBody replaces stats and table rows", () => {
    const html =
      '<div class="wisp-demo-stats"><article class="wisp-demo-stat"><strong>0</strong><span>Active records</span></article><article class="wisp-demo-stat"><strong>0</strong><span>Open alerts</span></article></div><tbody><tr><td colspan="4">Loading…</td></tr></tbody>';
    const out = hydrateDemoHtmlFromApiBody(html, {
      stats: { activeRecords: 42, openAlerts: 3 },
      items: [{ id: "a1", name: "Alpha", status: "active", updated: "2026-07-09" }],
    });
    expect(out).toContain("<strong>42</strong>");
    expect(out).toContain("<strong>3</strong>");
    expect(out).toContain("Alpha");
    expect(out).not.toContain("Loading…");
  });

  test("bindTracedLoadToCwlSource patches load block and HTML", () => {
    const source = readFileSync(join(fixtureRoot, "routes.cwl"), "utf8");
    const corpus = readCorpus({ root: join(fixtureRoot, "traces") });
    const bound = bindTracedLoadToCwlSource({
      cwlSource: source,
      apiIndex: indexTracedApiResponses(corpus),
    });
    expect(bound.routes[0]?.skip).toBeNull();
    expect(bound.text).toContain("activeRecords: 42");
    expect(bound.text).toContain("Alpha");
    expect(bound.text).not.toContain("Loading…");
  });

  test("bindSiteProjectLoadFromTraces writes patched CWL in temp dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-site-load-bind-"));
    try {
      mkdirSync(join(dir, "traces", "2026-07-09"), { recursive: true });
      cpSync(
        join(fixtureRoot, "traces", "2026-07-09", "bind-smoke.ndjson"),
        join(dir, "traces", "2026-07-09", "bind-smoke.ndjson"),
      );
      const cwlPath = join(dir, "routes.cwl");
      cpSync(join(fixtureRoot, "routes.cwl"), cwlPath);
      const result = bindSiteProjectLoadFromTraces({
        tracesDir: join(dir, "traces"),
        cwlPaths: [cwlPath],
      });
      expect(result.ok).toBe(true);
      const text = readFileSync(cwlPath, "utf8");
      expect(text).toContain("activeRecords: 42");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("inferUiPageApiPath and seedApiPathsIntoCwlSource (G9480)", () => {
    expect(inferUiPageApiPath("/modules/hardware")).toBe("/api/inventory");
    expect(inferUiPageApiPath("/admin/billing")).toBe("/api/admin");
    expect(inferUiPageApiPath("/docs/getting-started")).toBeNull();

    const source = `@page GET "/modules/hardware"
page hardware {
  effects: none;
  load { source: "lift", path: "/modules/hardware" };
  return html "<div class=\\"hardware-page\\"></div>";
}
`;
    const seeded = seedApiPathsIntoCwlSource({ cwlSource: source });
    expect(seeded.routesSeeded).toBe(1);
    expect(seeded.text).toContain('apiPath: "/api/inventory"');
  });

  test("hydrateStructuralHtmlFromApiBody fills interp and each holes (G9490)", () => {
    expect(resolveJsonPath({ items: [{ name: "Alpha" }] }, "items.0.name")).toBe("Alpha");
    const html =
      '<p><span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="itemCount"></span></p>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="items as item">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="item.name"></span>' +
      "</div>";
    const out = hydrateStructuralHtmlFromApiBody(html, {
      items: [{ name: "Alpha" }, { name: "Beta" }],
    });
    expect(out).toContain(">2<");
    expect(out).toContain("Alpha");
    expect(out).toContain("Beta");
    expect(out).not.toContain("legacy:markup-lift-svelte-each");
  });

  test("hydrate fills keyed each, formatters, widget shells, and simple ifs (G9730)", () => {
    expect(parseEachHeader("customers as customer (customer._id || customer.customerId)")).toEqual({
      collection: "customers",
      itemName: "customer",
    });
    expect(resolveInterpDetail({ analytics: { totalRevenue: 12.5 } }, "formatCurrency(analytics.totalRevenue)")).toBe(
      "$12.50",
    );
    const html =
      '<div class="cwl-widget-shell" data-cwl-widget-shell="DeviceList" aria-hidden="true"></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="active"><span>ON</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="missing"><span>OFF</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="customers as customer (customer.id)">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="customer.name"></span>' +
      "</div>";
    const out = hydrateStructuralHtmlFromApiBody(html, {
      active: true,
      devices: [{ id: "d1", name: "CPE", status: "online" }],
      customers: [{ id: "c1", name: "Acme" }],
    });
    expect(out).toContain('data-cwl-hydrated="1"');
    expect(out).toContain("d1");
    expect(out).toContain("online");
    expect(out).toContain("Acme");
    expect(out).toContain("ON");
    expect(out).not.toContain("OFF");
  });

  test("hydrate settles comparisons, length, and bool combinators (G9740)", () => {
    const body = {
      activeTab: "customers",
      tenants: [{ id: "t1" }],
      showCreateModal: false,
      showEditModal: false,
      networkDevices: [{ id: "n1" }],
      epcDevices: [],
    };
    expect(evaluateIfDetail("activeTab === 'customers'", body)).toBe(true);
    expect(evaluateIfDetail("tenants.length === 0", body)).toBe(false);
    expect(evaluateIfDetail("showCreateModal || showEditModal", body)).toBe(false);
    expect(evaluateIfDetail("networkDevices.length === 0 && epcDevices.length === 0", body)).toBe(false);
    expect(resolveInterpDetail(body, "tenants.length")).toBe(1);
    const html =
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="activeTab === \'customers\'"><span>TAB</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="showCreateModal || showEditModal"><span>MODAL</span></div>' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="tenants.length"></span>';
    const out = hydrateStructuralHtmlFromApiBody(html, body);
    expect(out).toContain("TAB");
    expect(out).not.toContain("MODAL");
    expect(out).toContain("1");
  });

  test("hydrate Object.entries each, ternaries, and $store (G9750)", () => {
    expect(
      parseEachHeader("Object.entries(report.summary.byStatus) as [status, count]"),
    ).toEqual({
      collection: "report.summary.byStatus",
      itemName: "status",
      objectEntries: true,
      entryKeys: ["status", "count"],
    });
    const body = {
      autoRefresh: false,
      isSaving: true,
      currentTenant: { name: "Acme" },
      report: { summary: { byStatus: { open: 2, closed: 5 } } },
    };
    expect(resolveInterpDetail(body, "autoRefresh ? 'pause' : 'play'")).toBe("play");
    expect(resolveInterpDetail(body, "isSaving ? 'Saving...' : 'Save'")).toBe("Saving...");
    expect(resolveInterpDetail(body, "$currentTenant.name")).toBe("Acme");
    expect(evaluateIfDetail("$currentTenant", body)).toBe(true);
    const html =
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="Object.entries(report.summary.byStatus) as [status, count]">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="status"></span>:' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="count"></span>' +
      "</div>";
    const out = hydrateStructuralHtmlFromApiBody(html, body);
    expect(out).toContain("open");
    expect(out).toContain("2");
    expect(out).toContain("closed");
    expect(out).not.toContain("legacy:markup-lift-svelte-each");
  });

  test("hydrate coalesce, inequality ifs, nested each, and formatDateTime (G9780)", () => {
    const body = {
      customer: { firstName: "Alex" },
      alerts: [{ id: "a1", name: "High latency" }],
      plans: [
        {
          id: "p1",
          name: "Residential",
          isPopular: true,
          features: ["100 Mbps", "Unlimited"],
        },
      ],
      report: { summary: { totalTickets: 10, byStatus: { open: 4 } } },
      createdAt: "2026-07-11T12:00:00.000Z",
    };
    expect(resolveInterpDetail(body, "customer?.firstName || 'Customer'")).toBe("Alex");
    expect(resolveInterpDetail(body, "missingName || 'N/A'")).toBe("N/A");
    expect(resolveInterpDetail(body, "formatDateTime(createdAt)")).toContain("2026-07-11");
    expect(resolveInterpDetail({ count: 4, total: 10 }, "((count / total) * 100).toFixed(1)")).toBe(
      "40.0",
    );
    expect(evaluateIfDetail("alerts.length > 0", body)).toBe(true);
    expect(evaluateIfDetail("pagination.pages > 1", { pagination: { pages: 2 } })).toBe(true);
    const html =
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="alerts.length > 0"><span>HAS</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="plans as plan">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="plan.name"></span>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="plan.isPopular"><span>HOT</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="plan.features as feature">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="feature"></span>' +
      "</div></div>";
    const out = hydrateStructuralHtmlFromApiBody(html, body);
    expect(out).toContain("HAS");
    expect(out).toContain("Residential");
    expect(out).toContain("HOT");
    expect(out).toContain("100 Mbps");
    expect(out).not.toContain("legacy:markup-lift-svelte-each");
  });

  test("hydrate getX alias, Object.entries ??, slice, getStatusCount (G9790)", () => {
    const body = {
      failedPayments: [{ id: "inv-1", amount: 10 }],
      report: {
        summary: { byStatus: { open: 2 } },
        alerts: { criticalOpen: [{ id: "t1" }, { id: "t2" }, { id: "t3" }] },
      },
      statusCounts: { available: 7 },
    };
    expect(parseEachHeader("getFailedPayments() as invoice")).toEqual({
      collection: "failedPayments",
      itemName: "invoice",
    });
    expect(parseEachHeader("Object.entries(report.summary.byStatus ?? ) as [status, count]")).toEqual(
      {
        collection: "report.summary.byStatus",
        itemName: "status",
        objectEntries: true,
        entryKeys: ["status", "count"],
      },
    );
    expect(parseEachHeader("report.alerts.criticalOpen.slice(0, 2) as ticket")).toEqual({
      collection: "report.alerts.criticalOpen",
      itemName: "ticket",
      sliceEnd: 2,
    });
    expect(evaluateIfDetail("!loading && getFailedPayments().length > 0", body)).toBe(true);
    expect(resolveInterpDetail(body, "getStatusCount('available')")).toBe(7);
    const html =
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="getFailedPayments() as invoice">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="invoice.id"></span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="Object.entries(report.summary.byStatus ?? ) as [status, count]">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="status"></span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="report.alerts.criticalOpen.slice(0, 2) as ticket">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="ticket.id"></span></div>';
    const out = hydrateStructuralHtmlFromApiBody(html, body);
    expect(out).toContain("inv-1");
    expect(out).toContain("open");
    expect(out).toContain("t1");
    expect(out).toContain("t2");
    expect(out).not.toContain("t3");
    expect(out).not.toContain("legacy:markup-lift-svelte-each");
  });

  test("forceSettle clears residual opaque holes (G9800)", () => {
    const html =
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="handleSave"></span>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-if" data-cwl-hole-detail="isRoleLocked(role)"><span>X</span></div>' +
      '<div data-cwl-hole="legacy:markup-lift-svelte-each" data-cwl-hole-detail="unknownCollection as item">' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="item.name"></span></div>' +
      '<span data-cwl-hole="legacy:markup-lift-svelte-interp" data-cwl-hole-detail="\'{filename}\'"></span>';
    const out = hydrateStructuralHtmlFromApiBody(html, {}, { forceSettle: true });
    expect(out).not.toContain("data-cwl-hole=");
    expect(out).toContain("{filename}");
  });
});
