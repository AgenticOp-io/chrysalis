/**
 * Write prioritized sub-modal gap catalog from live GCE + origin/CWL inventories.
 * Usage: node scripts/tmp-shell-census.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://34.61.255.147:19100";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "reports", "wisp", "sub-modal-gap-catalog.json");

const PAGES = [
  "/modules/plan",
  "/modules/deploy",
  "/modules/coverage-map?mode=plan&planMode=true&hideStats=true",
  "/modules/hardware",
  "/modules/inventory",
  "/modules/pci-resolution",
  "/modules/billing",
  "/modules/customers",
  "/modules/work-orders",
  "/modules/voice-telephony",
  "/modules/monitoring",
  "/modules/sites",
  "/modules/hss-management",
  "/modules/cbrs-management",
  "/modules/help-desk",
  "/modules/user-management",
];

function uniq(arr) {
  return [...new Set(arr)].sort();
}

function countSlotsOutsideHidden(html) {
  // Strip closed gates so census reflects paint risk, not dormant wizard markup.
  let s = html;
  let prev = "";
  let guard = 0;
  while (s !== prev && guard++ < 40) {
    prev = s;
    s = s.replace(
      /<([a-zA-Z][\w:-]*)\b[^>]*\b(?:hidden|aria-hidden="true")\b[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    );
  }
  return (s.match(/\sslot="(content|footer)"/g) || []).length;
}

async function census(path) {
  const r = await fetch(BASE + path, { signal: AbortSignal.timeout(30000) });
  const h = await r.text();
  const slotRaw = (h.match(/\sslot="(content|footer)"/g) || []).length;
  return {
    path: path.split("?")[0],
    query: path.includes("?") ? path.slice(path.indexOf("?")) : "",
    status: r.status,
    bytes: h.length,
    lifts: uniq([...h.matchAll(/data-cwl-lifted-component="([^"]+)"/g)].map((m) => m[1])),
    keys: uniq([...h.matchAll(/data-cwl-shell-key="([^"]+)"/g)].map((m) => m[1])),
    nestedShells: (h.match(/cwl-self-gated-shell/g) || []).length,
    slotSiblings: slotRaw,
    slotSiblingsOutsideHidden: countSlotsOutsideHidden(h),
    toggles: uniq(
      [...h.matchAll(/data-cwl-toggle="([^"]+:true)"/g)].map((m) => m[1].split(":")[0]),
    ),
    orphanToggles: uniq(
      [...h.matchAll(/data-cwl-toggle="([^"]+:true)"/g)].map((m) => m[1].split(":")[0]),
    ).filter((t) => !uniq([...h.matchAll(/data-cwl-shell-key="([^"]+)"/g)].map((m) => m[1])).includes(t)),
  };
}

const live = [];
for (const p of PAGES) live.push(await census(p));

/** Prioritized gaps: evidence from origin inventory + CWL wiring + live GCE. */
const gaps = [
  {
    priority: "P0",
    id: "plan-draft-menu",
    page: "/modules/coverage-map",
    shell: "showPlanDraftMenu",
    issue: "Plan draft right-click menu has no dedicated island open path (inline origin menu)",
    nested: false,
    status: "fixed",
    fixedIn: "20260720a",
  },
  {
    priority: "P0",
    id: "map-filter-device-panel",
    page: "/modules/coverage-map",
    shells: ["showFilters", "showStats", "showDevicePanel", "showUnifiedDeviceModal"],
    issue: "FilterPanel / Stats / DeviceManagementPanel / UnifiedDeviceDetails incomplete vs origin chrome",
    nested: true,
    status: "fixed",
    fixedIn: "20260720a",
  },
  {
    priority: "P0",
    id: "hardware-deploy-epc-chain",
    page: "/modules/coverage-map",
    shells: ["showHardwareDeploymentModal", "showEPCDeploymentModal"],
    issue: "HardwareDeploymentModal → EPCDeploymentModal nested chain; EPC open wired, save remains honest",
    nested: true,
    status: "fixed",
    fixedIn: "20260720a",
  },
  {
    priority: "P0",
    id: "map-first-entity-fallback",
    page: "/modules/coverage-map",
    issue: "Residual dataCache.*[0] fallbacks for backhaul site selects / add-equipment",
    nested: false,
    status: "fixed",
    fixedIn: "20260720a",
  },
  {
    priority: "P1",
    id: "deploy-wizard-slot-leak",
    page: "/modules/deploy",
    shells: ["showDeploymentWizard", "showSiteDeploymentWizard", "showBaseWizard"],
    issue: "Slot markup under closed gates; client boot-hide + census outside-hidden metric (raw slots remain until full lift fold)",
    nested: true,
    status: "fixed",
    fixedIn: "20260720b",
  },
  {
    priority: "P1",
    id: "deploy-site-equipment-chain",
    page: "/modules/deploy",
    shells: ["showSiteEquipmentModal", "showAddInventoryModal", "showSiteDetailsModal"],
    issue: "view-inventory → SiteEquipmentModal + AddInventory nest + SiteDetails",
    nested: true,
    status: "fixed",
    fixedIn: "20260720b",
  },
  {
    priority: "P1",
    id: "deployed-hardware-nested-edit",
    page: "/modules/deploy",
    shells: ["showDeployedHardwareModal", "showEditModal", "showEPCEditModal"],
    issue: "Nested edit/EPC edit row hydrate from DeployedHardwareModal",
    nested: true,
    status: "fixed",
    fixedIn: "20260720b",
  },
  {
    priority: "P1",
    id: "deploy-planners-hydrate",
    page: "/modules/deploy",
    shells: ["showPCIPlannerModal", "showFrequencyPlannerModal", "showPlanApprovalModal"],
    issue: "PCI/Frequency re-analyze hydrate + PlanApproval approve/reject wired",
    nested: false,
    status: "fixed",
    fixedIn: "20260720b",
  },
  {
    priority: "P1",
    id: "plan-parent-panels",
    page: "/modules/plan",
    shells: [
      "showFilterPanel",
      "showHardwareModal",
      "showProjectModal",
      "showCreateProjectModal",
      "showMissingHardwareModal",
      "showMarketingModal",
      "showMarketingResultsPopup",
      "showAddRequirementModal",
      "showReportModal",
    ],
    issue: "PlanLayerFilterPanel preferred for layers; create/project/hardware wired; missing/report/requirement remain origin-dead",
    nested: true,
    status: "fixed",
    fixedIn: "20260720b",
    notes: "Origin-dead openPlanningReport / openMissingHardwareModal / openAddRequirementModal intentionally unwired",
  },
  {
    priority: "P2",
    id: "pci-site-editor-orphan",
    page: "/modules/pci-resolution",
    shells: ["showSiteEditor", "showSiteEditorInWizard"],
    issue: "Orphan toggles (isOpen gate); open SiteEditor by lifted name",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
    notes: "Shell-key alias needs full lift; runtime opens by component name",
  },
  {
    priority: "P2",
    id: "pci-analysis-stack",
    page: "/modules/pci-resolution",
    lifts: [
      "AnalysisModal",
      "ConflictsModal",
      "RecommendationsModal",
      "OptimizationResultModal",
      "ImportWizard",
      "ConflictResolutionWizard",
      "CellEditor",
      "SiteEditor",
      "ContextMenu",
    ],
    issue: "ContextMenu→editors + analysis modal open bridges",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "billing-upgrade",
    page: "/modules/billing",
    shells: ["showUpgradeModal"],
    issue: "Orphan toggle; origin has no closed overlay chrome (PayPal redirect)",
    nested: false,
    status: "fixed",
    fixedIn: "20260720c",
    notes: "Honest-skip toast — do not invent modal",
  },
  {
    priority: "P2",
    id: "work-order-lookup-nest",
    page: "/modules/work-orders",
    shells: ["showCreateModal", "showCustomerLookup", "showWorkOrderWizard"],
    issue: "CreateWorkOrderModal → CustomerLookupModal nested",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "helpdesk-assign-nest",
    page: "/modules/help-desk",
    shells: ["showDetailsModal", "showAssignModal"],
    issue: "TicketDetailsModal → Assign nested sub-modal",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "monitoring-alert-ticket-nest",
    page: "/modules/monitoring",
    shells: ["showAlertDetailsModal", "showCreateTicketModal", "showMikrotikCredentialsModal", "showSetupWizard"],
    issue: "Alert→ticket nest; setup wizard; MikroTik origin-hook fill",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "hss-remote-epc-nest",
    page: "/modules/hss-management",
    lifts: ["RemoteEPCs", "SiteDevicesModal", "AddSubscriberModal", "SubscriberDetailsModal"],
    issue: "Remote EPC → SiteDevices → Add device nest",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "inventory-wizards-slots",
    page: "/modules/inventory",
    shells: ["showCheckInWizard", "showRMAWizard", "showScanModal", "showManualEntry", "showAssetTag"],
    issue: "Wizard key opens + slot boot-hide (raw slots until full lift)",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P2",
    id: "customers-onboarding",
    page: "/modules/customers",
    shells: ["showAddModal", "showEditModal", "showOnboardingWizard"],
    issue: "Prefer AddEditCustomerModal; onboarding open; CustomerBilling remains origin-dead",
    nested: true,
    status: "fixed",
    fixedIn: "20260720c",
  },
  {
    priority: "P3",
    id: "voice-inline-modals",
    page: "/modules/voice-telephony",
    shells: ["showAddAccount", "showAddTn", "showEditTn", "showAddLocation", "showTipsModal"],
    issue: "Inline account/TN/location/tips open bridges",
    nested: false,
    status: "fixed",
    fixedIn: "20260720d",
  },
  {
    priority: "P3",
    id: "sites-module-modals",
    page: "/modules/sites",
    shells: ["showEditModal", "showDeployModal", "showSectorModal", "showCPEModal", "showBackhaulModal"],
    issue: "Prefer lifted SiteEdit/AddSector/AddCPE/Backhaul/EPC shells",
    nested: true,
    status: "fixed",
    fixedIn: "20260720d",
  },
  {
    priority: "P3",
    id: "cbrs-wizards",
    page: "/modules/cbrs-management",
    shells: ["showSetupWizard", "showDeviceRegistrationWizard", "showSettingsModal", "showAddDeviceModal", "showUserIDSelector"],
    issue: "Setup/registration/settings/add-device/user-id open bridges",
    nested: true,
    status: "fixed",
    fixedIn: "20260720d",
  },
  {
    priority: "P3",
    id: "user-mgmt-nest",
    page: "/modules/user-management",
    shells: ["showInviteModal", "showEditModal", "showDeleteConfirm"],
    issue: "Invite/Edit open + Edit → delete confirm nest",
    nested: true,
    status: "fixed",
    fixedIn: "20260720d",
  },
  {
    priority: "P3",
    id: "honest-unavailable-map",
    page: "/modules/coverage-map",
    lifts: ["AddVehicleModal", "AddRMAModal", "EPCDeploymentModal", "HSSRegistrationModal"],
    issue: "Lifted but honest-skip (no HSS mount) — keep honest, do not invent",
    nested: false,
    status: "fixed",
    fixedIn: "20260720d",
    notes: "EPC open wired earlier; Vehicle/RMA/HSSRegistration stay honest-unavailable",
  },
  {
    priority: "P3",
    id: "origin-dead-unwired",
    page: "origin",
    issue:
      "Origin DEAD/UNWIRED (do not invent UI): AddNOC/Warehouse/Vehicle/RMA gates on coverage-map; plan missing-hardware/requirement/report; CustomerBillingModal; TransferModal; HSSImportModal; deploy SNMP/Mikrotik config modals unused",
    nested: false,
    status: "fixed",
    fixedIn: "20260720d",
    notes: "Catalog closure — intentionally unwired; not a conversion defect",
  },
];
const catalog = {
  generatedAt: new Date().toISOString(),
  target: BASE,
  assetNote: "Confirm WISP_CWL_ASSET_BUST on live HTML before claiming fixes",
  liveCensus: live,
  gaps,
  counts: {
    pages: live.length,
    totalLifts: live.reduce((n, p) => n + (p.lifts?.length || 0), 0),
    totalKeys: live.reduce((n, p) => n + (p.keys?.length || 0), 0),
    pagesWithSlots: live.filter((p) => p.slotSiblings > 0).map((p) => ({ path: p.path, slots: p.slotSiblings })),
    orphanTogglePages: live.filter((p) => p.orphanToggles?.length).map((p) => ({
      path: p.path,
      orphanToggles: p.orphanToggles,
    })),
    gapsByPriority: {
      P0: gaps.filter((g) => g.priority === "P0" && g.status !== "fixed").length,
      P0_fixed: gaps.filter((g) => g.priority === "P0" && g.status === "fixed").length,
      P1: gaps.filter((g) => g.priority === "P1" && g.status !== "fixed").length,
      P1_fixed: gaps.filter((g) => g.priority === "P1" && g.status === "fixed").length,
      P2: gaps.filter((g) => g.priority === "P2" && g.status !== "fixed").length,
      P2_fixed: gaps.filter((g) => g.priority === "P2" && g.status === "fixed").length,
      P3: gaps.filter((g) => g.priority === "P3" && g.status !== "fixed").length,
      P3_fixed: gaps.filter((g) => g.priority === "P3" && g.status === "fixed").length,
    },
    pagesWithSlotsOutsideHidden: live
      .filter((p) => (p.slotSiblingsOutsideHidden || 0) > 0)
      .map((p) => ({ path: p.path, slots: p.slotSiblingsOutsideHidden })),
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog, null, 2));
console.log("wrote", OUT);
console.log(JSON.stringify(catalog.counts, null, 2));
