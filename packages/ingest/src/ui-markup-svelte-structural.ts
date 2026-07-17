/**
 * Structural-shell Svelte markup lift (DESIGN D6367, G9460; fill-holes G9500 / D6371).
 *
 * When a page is not fully static, emit an HTML shell that preserves layout
 * structure and records explicit holes for dynamic Svelte constructs.
 * Never invent component trees or live data — holes only (§3 item 6).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { extractHtmlClassNames, liftStaticSveltePageHtml } from "./ui-markup-svelte.js";

export type SvelteMarkupLiftMode = "static" | "structural-shell";

export interface SvelteMarkupLiftHole {
  readonly reason: string;
  readonly detail: string;
}

export interface SvelteMarkupLiftResult {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<SvelteMarkupLiftHole>;
}

export const HOLE_EACH = "legacy:markup-lift-svelte-each";
export const HOLE_IF = "legacy:markup-lift-svelte-if";
export const HOLE_INTERP = "legacy:markup-lift-svelte-interp";
export const HOLE_COMPONENT = "legacy:markup-lift-svelte-component";
const HOLE_DIRECTIVE = "legacy:markup-lift-svelte-directive";
const HOLE_EVENT = "legacy:markup-lift-svelte-event";
const HOLE_RESIDUAL = "legacy:markup-lift-svelte-residual";

/**
 * Layout-only Svelte wrappers that contribute no visible chrome of their own.
 * Children are kept; the component tag is not recorded as a hole (G9490 / D6370).
 */
export const DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS: ReadonlySet<string> = new Set([
  "TenantGuard",
]);

/**
 * Showcase settle for common loading/error flags (G9500).
 * Documented as showcase settle — not runtime truth from the live app.
 */
export const DEFAULT_SHOWCASE_LOAD_BOOLS: Readonly<Record<string, boolean>> = {
  isLoading: false,
  loading: false,
  error: false,
  success: false,
  statusLoading: false,
  statusError: false,
  agentsError: false,
  showOnboardingWizard: false,
  showSetupWizard: false,
  showDemoChrome: false,
  simpleLoginOnly: false,
  /** Login page: main form visible; reset/demo visitor closed to match product login. */
  showPasswordReset: false,
  passwordResetSent: false,
  demoVisitorEnabled: false,
  /** Dashboard chrome — closed overlays (D6443). */
  showSettings: false,
  showTipsModal: false,
  /** NotificationCenter / dropdown panels default closed. */
  open: false,
  showCreateModal: false,
  showEditModal: false,
  showDeleteConfirm: false,
  showDeleteModal: false,
  showAssignOwnerModal: false,
  showUsersModal: false,
  showPlanDraftMenu: false,
  loadingAgents: false,
  loadingUsers: false,
  loadingSites: false,
  saving: false,
  isSaving: false,
  isSigningIn: false,
  isLoggedIn: true,
  isAdmin: true,
  autoRefresh: false,
  existingConfig: false,
};

/** Components safe to inline when their lift is fully static (no nested holes). */
export const DEFAULT_STATIC_INLINE_COMPONENTS: ReadonlySet<string> = new Set([
  "TopBrand",
  "DemoSiteBanner",
  "AdminBreadcrumb",
]);

/**
 * Coverage-map (and similar) interactive panels inlined with holes allowed (D6442).
 * Prefer real lifted markup + `hidden` closed state over empty shells.
 */
export const DEFAULT_STRUCTURAL_INLINE_COMPONENTS: ReadonlySet<string> = new Set([
  "FilterPanel",
  "HelpModal",
  "TipsModal",
  "DeviceManagementPanel",
  "MapContextMenu",
  "TowerActionsMenu",
  "SectorActionsMenu",
  "BackhaulActionsMenu",
  // Coverage-map Add*/edit modals — lift closed chrome (D6443/D6444), not empty shells that block the map.
  "AddSiteModal",
  "AddNOCModal",
  "AddWarehouseModal",
  "AddVehicleModal",
  "AddRMAModal",
  "AddSectorModal",
  "AddCPEModal",
  "AddBackhaulLinkModal",
  "AddBackhaulModal",
  "AddInventoryModal",
  "EPCDeploymentModal",
  "HSSRegistrationModal",
  "HardwareDeploymentModal",
  "SiteEditModal",
  "UnifiedDeviceDetailsModal",
  // Inventory / customers — origin modal chrome (D6443), not invented substitutes
  "TransferModal",
  "CustomerBillingModal",
  "AddEditCustomerModal",
]);

/** Page-local UI toggles whose closed chrome must remain in the DOM (hidden), not deleted. */
const UI_TOGGLE_OVERLAY_RE =
  /\b(show[A-Z][A-Za-z0-9_]*|hide[A-Z][A-Za-z0-9_]*|open|visible|loading[A-Z][A-Za-z0-9_]*|is(?:Open|Visible|Loading|Editing|SigningIn|Saving|DeployMode|PlanMode|LoggedIn)\b|is[A-Z][A-Za-z0-9_]*(?:Open|Visible|Loading|Editing|DeployMode|PlanMode)|showFilters|showStats|showDevicePanel|showHelpModal|showTipsModal|showContextMenu|showTowerActionsMenu|showSectorActionsMenu|showBackhaulActionsMenu|showPlanDraftMenu|showOnboardingWizard|showSetupWizard|showDemoChrome|showPasswordReset|passwordResetSent|demoVisitorEnabled|showSettings|showCreateModal|showEditModal|showDeleteConfirm|showDeleteModal|showAssignOwnerModal|showUsersModal)\b/;

export function isUiToggleOverlayIfHeader(header: string): boolean {
  return UI_TOGGLE_OVERLAY_RE.test(header);
}

/** Stamp closed-state attributes on the first element root (translate closed, do not invent). */
export function stampClosedUiChrome(html: string): string {
  const lead = html.match(/^\s*/)?.[0] ?? "";
  const trimmed = html.slice(lead.length);
  if (trimmed.length === 0) return html;
  const nameMatch = /^<(div|nav|aside|section)\b/i.exec(trimmed);
  if (nameMatch === null) {
    return `${lead}<div hidden aria-hidden="true">${trimmed}</div>`;
  }
  // Brace/quote-aware open-tag end — naive [^>] breaks on onclick={() => …}.
  let i = nameMatch[0].length;
  let brace = 0;
  let quote: '"' | "'" | null = null;
  while (i < trimmed.length) {
    const ch = trimmed[i]!;
    if (quote !== null) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "{") {
      brace++;
      i++;
      continue;
    }
    if (ch === "}") {
      brace = Math.max(0, brace - 1);
      i++;
      continue;
    }
    if (brace === 0 && ch === ">") {
      i++;
      break;
    }
    i++;
  }
  const open = trimmed.slice(0, i);
  const rest = trimmed.slice(i);
  if (/\bhidden\b/i.test(open)) {
    if (!/\baria-hidden\b/i.test(open)) {
      return `${lead}${open.replace(/>$/, ' aria-hidden="true">')}${rest}`;
    }
    return html;
  }
  return `${lead}${open.replace(/>$/, ' hidden aria-hidden="true">')}${rest}`;
}

/**
 * Modal wrappers collapsed to inert shells (G9660 / D6383; expanded G9690 / D6388).
 * Showcase-only: aria-hidden dialog placeholder; live behavior stays a hole elsewhere.
 */
export const DEFAULT_MODAL_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "TipsModal",
  "HelpModal",
  "CreateWorkOrderModal",
  "CPEPerformanceModal",
  "PlanMarketingModal",
  "EPCDeploymentModal",
  "SiteEditModal",
  "AddEditCustomerModal",
  "AddSectorModal",
  "AddCPEModal",
  "AddBackhaulLinkModal",
  "AddBackhaulModal",
  "AddInventoryModal",
  "ScanModal",
  "TicketDetailsModal",
  "SettingsModal",
  "ParameterEditorModal",
  "UnifiedDeviceDetailsModal",
  "AddSiteModal",
  "AddNOCModal",
  "AddWarehouseModal",
  "AddVehicleModal",
  "AddRMAModal",
  "HSSRegistrationModal",
  "HardwareDeploymentModal",
  "PCIPlannerModal",
  "FrequencyPlannerModal",
  "PlanApprovalModal",
  "DeployedHardwareModal",
  "SiteDetailsModal",
  "SiteEquipmentModal",
  "CustomerLookupModal",
  "BundleDetailsModal",
  "CreateTicketModal",
  "MikrotikCredentialsModal",
  "MonitoringSiteDetailsModal",
  "AnalysisModal",
  "ConflictsModal",
  "RecommendationsModal",
  "OptimizationResultModal",
  "InviteUserModal",
  "EditUserModal",
  "PlanMarketingResultsPopup",
]);

/**
 * Map / chart embeds collapsed to inert shells (G9680 / D6388) — no live map/chart invented.
 */
export const DEFAULT_MAP_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "SharedMap",
  "CoverageMapView",
  "BasemapSwitcher",
  "MapContextMenu",
]);

export const DEFAULT_CHART_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "TR069RSSIChart",
  "LTESignalChart",
  "TR069SINRChart",
  "TR069PCIChart",
  "TR069EARFCNChart",
  "TR069UptimeChart",
]);

/**
 * Nav / menu chrome collapsed to inert shells (G9710 / D6390) — no live menus invented.
 */
export const DEFAULT_NAV_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "MainMenu",
  "ModuleWizardMenu",
  "AdminBreadcrumb",
  "NotificationCenter",
  "VerticalMenu",
  "SettingsMenu",
  "ContextMenu",
  "TowerActionsMenu",
  "SectorActionsMenu",
  "BackhaulActionsMenu",
  "FilterPanel",
  "ProjectFilterPanel",
  "PlanLayerFilterPanel",
]);

/**
 * Multi-step wizard chrome collapsed to inert shells (G9710 / D6390).
 */
export const DEFAULT_WIZARD_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "DeviceOnboardingWizard",
  "TroubleshootingWizard",
  "PresetCreationWizard",
  "BulkOperationsWizard",
  "FirmwareUpdateWizard",
  "DeviceRegistrationWizard",
  "CBRSDeviceRegistrationWizard",
  "CustomerOnboardingWizard",
  "DeploymentWizard",
  "SiteDeploymentWizard",
  "SubscriberCreationWizard",
  "BandwidthPlanWizard",
  "SubscriberGroupWizard",
  "InventoryCheckInWizard",
  "RMATrackingWizard",
  "ImportWizard",
  "ConflictResolutionWizard",
  "WorkOrderCreationWizard",
  "FirstTimeSetupWizard",
  "OrganizationSetupWizard",
  "InitialConfigurationWizard",
]);

/**
 * Live data widgets collapsed to inert shells (G9730 / D6392).
 * Hydration may fill a summary table from traced/showcase JSON — never invents controls.
 */
export const DEFAULT_WIDGET_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "BandwidthPlans",
  "GroupManagement",
  "GlobalSettings",
  "CPEDeviceRow",
  "TR069Actions",
  "LTEKPICards",
  "DeviceList",
  "GrantStatus",
  "UserIDSelector",
  "DeviceManagementPanel",
  "ModalManager",
  "StripeCardForm",
  "SNMPDevicesPanel",
  "HSSStats",
  "MMEConnections",
  "BulkImport",
  "AssetTagViewer",
  "SNMPConfigurationPanel",
  "PCIStatusWidget",
  "NetworkManager",
  "CellEditor",
  "SiteEditor",
  "TowerManager",
  "ConflictReportExport",
  "WorkOrderCard",
]);

function modalShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-modal-shell" data-cwl-modal-shell="${safe}" aria-hidden="true" role="dialog"></div>`;
}

function mapShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-map-shell" data-cwl-map-shell="${safe}" aria-hidden="true" role="img"></div>`;
}

function chartShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-chart-shell" data-cwl-chart-shell="${safe}" aria-hidden="true" role="img"></div>`;
}

function navShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<nav class="cwl-nav-shell" data-cwl-nav-shell="${safe}" aria-hidden="true"></nav>`;
}

function wizardShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-wizard-shell" data-cwl-wizard-shell="${safe}" aria-hidden="true" role="dialog"></div>`;
}

function widgetShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-widget-shell" data-cwl-widget-shell="${safe}" aria-hidden="true"></div>`;
}

/**
 * Scan a PascalCase Svelte component open/self-closing tag with brace-aware
 * attribute parsing. Naive `[^>]*` breaks on `on:click={() => …}` because `=>`
 * contains `>` (G9904).
 */
export function findPascalComponentTagEnd(source: string, start: number): number | null {
  if (source[start] !== "<") return null;
  const nameMatch = /^<([A-Z][A-Za-z0-9_]*)/.exec(source.slice(start));
  if (nameMatch === null) return null;
  let j = start + nameMatch[0].length;
  let brace = 0;
  let quote: '"' | "'" | null = null;
  let tick = false;
  /** `${...}` nesting depth while inside a template literal. */
  let tickExpr = 0;
  while (j < source.length) {
    const ch = source[j]!;

    // Comments — only when not inside a string / template
    if (quote === null && !tick && ch === "/" && source[j + 1] === "/") {
      j += 2;
      while (j < source.length && source[j] !== "\n" && source[j] !== "\r") j++;
      continue;
    }
    if (quote === null && !tick && ch === "/" && source[j + 1] === "*") {
      j += 2;
      while (j < source.length && !(source[j] === "*" && source[j + 1] === "/")) j++;
      j = Math.min(source.length, j + 2);
      continue;
    }

    if (quote !== null) {
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) quote = null;
      j++;
      continue;
    }

    if (tick) {
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (tickExpr > 0) {
        if (ch === "'" || ch === '"') {
          quote = ch;
          j++;
          continue;
        }
        if (ch === "`") {
          // Nested template literal inside ${}
          tickExpr++; // treat as nested tick via brace-like counter? simpler: scan nested tick
          // Actually nested ticks are rare; use recursive-ish skip:
          j++;
          let nestedExpr = 0;
          while (j < source.length) {
            const nc = source[j]!;
            if (nc === "\\") {
              j += 2;
              continue;
            }
            if (nestedExpr === 0 && nc === "`") {
              j++;
              break;
            }
            if (nc === "$" && source[j + 1] === "{") {
              nestedExpr++;
              j += 2;
              continue;
            }
            if (nestedExpr > 0 && nc === "{") {
              nestedExpr++;
              j++;
              continue;
            }
            if (nestedExpr > 0 && nc === "}") {
              nestedExpr--;
              j++;
              continue;
            }
            if (nestedExpr > 0 && (nc === "'" || nc === '"')) {
              const nq = nc;
              j++;
              while (j < source.length) {
                if (source[j] === "\\") {
                  j += 2;
                  continue;
                }
                if (source[j] === nq) {
                  j++;
                  break;
                }
                j++;
              }
              continue;
            }
            j++;
          }
          continue;
        }
        if (ch === "{") {
          tickExpr++;
          j++;
          continue;
        }
        if (ch === "}") {
          tickExpr--;
          j++;
          continue;
        }
        j++;
        continue;
      }
      if (ch === "`") {
        tick = false;
        j++;
        continue;
      }
      if (ch === "$" && source[j + 1] === "{") {
        tickExpr = 1;
        j += 2;
        continue;
      }
      j++;
      continue;
    }

    if (ch === "`") {
      tick = true;
      j++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      j++;
      continue;
    }
    if (ch === "{") {
      brace++;
      j++;
      continue;
    }
    if (ch === "}") {
      brace = Math.max(0, brace - 1);
      j++;
      continue;
    }
    if (brace === 0 && ch === "/" && source[j + 1] === ">") {
      return j + 2;
    }
    if (brace === 0 && ch === ">") {
      if (j > 0 && source[j - 1] === "=") {
        // `=>` arrow — not a tag closer
        j++;
        continue;
      }
      return j + 1;
    }
    j++;
  }
  return null;
}

/**
 * Remove leftover Svelte self-close tails after shell substitution
 * (e.g. ` true}` + `/>` from `on:select={() => x = true}`).
 */
export function scrubStructuralMarkupArtifacts(html: string): string {
  let s = html;
  // Full shell element followed by orphan prop/event tail + `/>`
  s = s.replace(
    /(<(?:nav|div)\b[^>]*\b(?:cwl-(?:nav|wizard|widget|modal|map|chart)-shell|data-cwl-(?:nav|wizard|widget|modal|map|chart)-shell)\b[^>]*>\s*<\/(?:nav|div)>)\s*[^<]*?\}\s*\/>/gi,
    "$1",
  );
  // Standalone orphan tails (already-hydrated shells, partial prior lifts)
  s = s.replace(/\s+(?:true|false)\}\s*\/>/g, "");
  s = s.replace(/\s*\([^)]*?=\s*(?:true|false)\)\}\s*\/>/g, "");
  s = s.replace(/\s+[A-Za-z_][\w.]*\s*=\s*(?:true|false)\}\s*\/>/g, "");
  // G9906 — residual attribute / directive junk
  s = s.replace(/\bclass="([^"]*)"\}/g, 'class="$1"');
  s = s.replace(/\bclass='([^']*)'\}/g, "class='$1'");
  s = s.replace(/\s+on:[a-zA-Z][\w|:.]*=(?=["'\s/>]|$)/g, "");
  s = s.replace(/\s+on:[a-zA-Z][\w|:]*="[^"]*"/g, "");
  s = s.replace(/\s+on:[a-zA-Z][\w|:]*='[^']*'/g, "");
  s = s.replace(/\bform\}>/g, "form>");
  s = s.replace(/\)\}>/g, ">");
  s = s.replace(/"\}(?=[\s>])/g, '"');
  // Broken SVG open tags like `</modules/inventory d="…">`
  s = s.replace(/<\/modules\/[^>\s"]+\s+d=/gi, "<path d=");
  // G9911 — broken SVG closes like `<//modules/inventory>`
  s = s.replace(/<\/?\/modules\/[^>]*>/gi, "</path>");
  // G9914 — residual Svelte directives left in static HTML (do not strip <script>/<style>)
  s = s.replace(/<svelte:head>[\s\S]*?<\/svelte:head>/gi, "");
  s = s.replace(/<svelte:window\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:window\b[\s\S]*?<\/svelte:window>/gi, "");
  s = s.replace(/<svelte:body\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:body\b[\s\S]*?<\/svelte:body>/gi, "");
  s = s.replace(/<svelte:document\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:document\b[\s\S]*?<\/svelte:document>/gi, "");
  // Literal `\r` / `\n` sequences left in markup text
  s = s.replace(/\\r\\n/g, "\n");
  s = s.replace(/\\r/g, "");
  s = s.replace(/\\n/g, "\n");
  // Mojibake after ← (e.g. ←)
  s = s.replace(/←[\u0080-\u009F\uFFFD\u0090]+/g, "←");
  // G9920 — orphan `}` / handler tails after closed shell divs
  s = s.replace(/(<\/(?:div|nav)>)\s*[^<\n]*?\}\s*\/>/g, "$1");
  s = s.replace(/(<\/(?:div|nav)>)\s*\}/g, "$1");
  return s;
}

export interface LiftStructuralSvelteOptions {
  readonly loadBools?: Readonly<Record<string, boolean>>;
  /** When true (default for convert-site), merge {@link DEFAULT_SHOWCASE_LOAD_BOOLS}. */
  readonly applyShowcaseLoadBools?: boolean;
  readonly passthroughComponents?: ReadonlySet<string>;
  /** Basename → absolute `.svelte` path for static inlining. */
  readonly componentSources?: ReadonlyMap<string, string>;
  /** Names eligible for static inline when liftMode is static. */
  readonly staticInlineComponents?: ReadonlySet<string>;
  /**
   * Names eligible for structural inline (holes allowed) — used for coverage-map
   * panels so original CSS classes exist in the DOM (D6442).
   */
  readonly structuralInlineComponents?: ReadonlySet<string>;
  readonly modalShellComponents?: ReadonlySet<string>;
  readonly mapShellComponents?: ReadonlySet<string>;
  readonly chartShellComponents?: ReadonlySet<string>;
  readonly navShellComponents?: ReadonlySet<string>;
  readonly wizardShellComponents?: ReadonlySet<string>;
  readonly widgetShellComponents?: ReadonlySet<string>;
}

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safeDetail = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safeDetail}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safeDetail}"></span>`;
}

function pushHole(holes: SvelteMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

/** Remove `{...}` mustaches with balanced braces (handles nested quotes). */
function stripBalancedMustaches(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== "{") {
      out += value[i];
      continue;
    }
    let depth = 0;
    let j = i;
    for (; j < value.length; j++) {
      if (value[j] === "{") depth++;
      else if (value[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    i = j - 1;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Strip Svelte script / style / head blocks. */
export function stripSvelteNonMarkup(source: string): string {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svelte:head>[\s\S]*?<\/svelte:head>/gi, "")
    .replace(/<svelte:window\b[^>]*?\/>/gi, "")
    .replace(/<svelte:window\b[\s\S]*?<\/svelte:window>/gi, "")
    .replace(/<svelte:body\b[^>]*?\/>/gi, "")
    .replace(/<svelte:body\b[\s\S]*?<\/svelte:body>/gi, "")
    .replace(/<svelte:document\b[^>]*?\/>/gi, "")
    .replace(/<svelte:document\b[\s\S]*?<\/svelte:document>/gi, "");
}

/**
 * Index `.svelte` component files under a project `src/` tree by basename
 * (without extension). Route `+page.svelte` / `+layout.svelte` are skipped.
 */
export function indexSvelteComponentSources(projectSrcRoot: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(projectSrcRoot)) return map;
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".svelte-kit") continue;
        walk(p);
        continue;
      }
      if (!e.name.endsWith(".svelte")) continue;
      if (e.name.startsWith("+")) continue;
      const name = basename(e.name, ".svelte");
      if (!map.has(name)) map.set(name, p);
    }
  };
  walk(projectSrcRoot);
  return map;
}

interface SvelteBlockMatch {
  readonly kind: "if" | "each";
  readonly start: number;
  readonly end: number;
  readonly header: string;
  readonly trueBody: string;
  readonly elseBody: string | null;
}

/** Find the next `{#if …}` or `{#each …}` block with balanced nesting. */
export function findNextSvelteBlock(source: string, from = 0): SvelteBlockMatch | null {
  const openRe = /\{#(if|each)\b/gi;
  openRe.lastIndex = from;
  const open = openRe.exec(source);
  if (!open || open.index === undefined) return null;
  const kind = open[1]!.toLowerCase() as "if" | "each";
  const start = open.index;
  // Header ends at first `}` at depth 1 from the opening `{`
  let i = start + 1;
  let depth = 1;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const header = source.slice(start + 2 + kind.length, i - 1).trim();
  const bodyStart = i;
  /** Index where the true branch ends (start of `{:else}` / `{:else if}`), if any. */
  let elseMarkerAt: number | null = null;
  /** Index where the else branch body starts (after the else header). */
  let elseBodyStart: number | null = null;
  depth = 1;
  while (i < source.length) {
    if (source[i] !== "{") {
      i++;
      continue;
    }
    const slice = source.slice(i);
    if (/^\{#(if|each)\b/i.test(slice)) {
      depth++;
      i += 2;
      continue;
    }
    if (/^\{\/(if|each)\}/i.test(slice)) {
      depth--;
      if (depth === 0) {
        const trueBody =
          elseMarkerAt === null ? source.slice(bodyStart, i) : source.slice(bodyStart, elseMarkerAt);
        const elseBody =
          elseBodyStart === null ? null : source.slice(elseBodyStart, i);
        const close = slice.match(/^\{\/(if|each)\}/i)!;
        return {
          kind,
          start,
          end: i + close[0].length,
          header,
          trueBody,
          elseBody,
        };
      }
      i += 2;
      continue;
    }
    if (kind === "if" && depth === 1 && /^\{:else\}/i.test(slice)) {
      elseMarkerAt = i;
      elseBodyStart = i + "{:else}".length;
      i = elseBodyStart;
      continue;
    }
    if (kind === "if" && depth === 1 && /^\{:else\s+if\b/i.test(slice)) {
      elseMarkerAt = i;
      let d = 1;
      let j = i + 1;
      for (; j < source.length; j++) {
        if (source[j] === "{") d++;
        else if (source[j] === "}") {
          d--;
          if (d === 0) {
            j++;
            break;
          }
        }
      }
      elseBodyStart = j;
      i = j;
      continue;
    }
    i++;
  }
  return null;
}

function extractScriptBlocks(source: string): string {
  let out = "";
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out += `\n${m[1] ?? ""}`;
  return out;
}

/**
 * Pull `const`/`let` scalar bindings from Svelte `<script>` (origin initializers).
 * Bools feed loadBools; numbers/strings feed hydrate body (D6448).
 */
export function extractScriptScalarsFromSvelte(source: string): {
  bools: Record<string, boolean>;
  scalars: Record<string, string | number | boolean>;
} {
  const script = extractScriptBlocks(source);
  const bools: Record<string, boolean> = {};
  const scalars: Record<string, string | number | boolean> = {};
  const re =
    /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*(true|false|-?\d+(?:\.\d+)?|'([^']*)'|"([^"]*)")\s*[;\n,]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const name = m[1]!;
    if (m[2] === "true" || m[2] === "false") {
      bools[name] = m[2] === "true";
      scalars[name] = m[2] === "true";
    } else if (m[3] != null) {
      scalars[name] = m[3];
    } else if (m[4] != null) {
      scalars[name] = m[4];
    } else if (m[2] != null && /^-?\d/.test(m[2])) {
      scalars[name] = Number(m[2]);
    }
  }
  return { bools, scalars };
}

/**
 * Pull `const name = [ { … }, … ]` object arrays from Svelte `<script>` (origin truth).
 * Used to expand `{#each modules as module}` without inventing rows (D6442/D6443).
 */
export function extractConstObjectArraysFromSvelte(
  source: string,
): Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>> {
  const script = extractScriptBlocks(source);
  /** @type {Record<string, Record<string, unknown>[]>} */
  const out: Record<string, Record<string, unknown>[]> = {};
  const startRe = /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(script))) {
    const name = m[1]!;
    const openIdx = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let i = openIdx;
    for (; i < script.length; i++) {
      const ch = script[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const lit = script.slice(openIdx, i);
    const rows = parseLooseObjectArrayLiteral(lit);
    if (rows.length > 0) out[name] = rows;
  }
  return out;
}

/**
 * Best-effort TS/JS object-array literal → plain objects (strings, string[], bools).
 * @param {string} lit including surrounding `[` `]`
 */
function parseLooseObjectArrayLiteral(lit: string): Record<string, unknown>[] {
  /** @type {Record<string, unknown>[]} */
  const rows: Record<string, unknown>[] = [];
  // Split top-level `{...}` objects
  let depth = 0;
  let start = -1;
  for (let i = 0; i < lit.length; i++) {
    const ch = lit[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const objLit = lit.slice(start, i + 1);
        const row = parseLooseObjectLiteral(objLit);
        if (Object.keys(row).length > 0) rows.push(row);
        start = -1;
      }
    }
  }
  return rows;
}

function parseLooseObjectLiteral(objLit: string): Record<string, unknown> {
  /** @type {Record<string, unknown>} */
  const row: Record<string, unknown> = {};
  // id: 'plan' | name: "…" | status: 'active' | features: ['a', 'b'] | path: '/x'
  const fieldRe =
    /(?:^|[,{\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"|(\[[^\]]*\])|(true|false)|([0-9]+))/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(objLit))) {
    const key = m[1]!;
    if (m[2] != null) row[key] = m[2].replace(/\\'/g, "'");
    else if (m[3] != null) row[key] = m[3].replace(/\\"/g, '"');
    else if (m[4] != null) {
      const arrLit = m[4];
      const items: string[] = [];
      const itemRe = /'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"/g;
      let im: RegExpExecArray | null;
      while ((im = itemRe.exec(arrLit))) items.push((im[1] ?? im[2] ?? "").replace(/\\'/g, "'"));
      row[key] = items;
    } else if (m[5] != null) row[key] = m[5] === "true";
    else if (m[6] != null) row[key] = Number(m[6]);
  }
  return row;
}

function expandEachTemplateForRow(
  template: string,
  itemName: string,
  row: Readonly<Record<string, unknown>>,
): string {
  let t = template;
  // Nested `{#each item.features as feature}…{/each}`
  const nestedEach = new RegExp(
    `\\{#each\\s+${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s+as\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\}([\\s\\S]*?)\\{\\/each\\}`,
    "g",
  );
  t = t.replace(nestedEach, (_all, prop: string, sub: string, body: string) => {
    const arr = row[prop];
    if (!Array.isArray(arr)) return "";
    return arr
      .map((v) => body.replace(new RegExp(`\\{${sub}\\}`, "g"), String(v)))
      .join("");
  });
  // `{#if item.status === 'active'}…{:else}…{/if}`
  const ifEq = new RegExp(
    `\\{#if\\s+${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*===\\s*'([^']*)'\\}([\\s\\S]*?)(?:\\{:else\\}([\\s\\S]*?))?\\{\\/if\\}`,
    "g",
  );
  t = t.replace(ifEq, (_a, prop: string, want: string, yes: string, no: string) =>
    String(row[prop] ?? "") === want ? yes : (no ?? ""),
  );
  // class:active={item.status === 'active'} → merge into class="module-card active"
  t = t.replace(
    new RegExp(
      `class:(active|coming-soon)=\\{${itemName}\\.status\\s*===\\s*'(active|coming-soon)'\\}`,
      "g",
    ),
    (_a, cls: string, want: string) => {
      if (String(row.status ?? "") !== want) return "";
      // Prefer merging into an existing class="…" on the same opening tag later.
      return ` data-cwl-class-extra="${cls}"`;
    },
  );
  t = t.replace(
    /class="([^"]*)"([^>]*?)\sdata-cwl-class-extra="([^"]+)"/g,
    (_a, cls: string, rest: string, extra: string) =>
      `class="${cls} ${extra}"${rest}`,
  );
  t = t.replace(/\sdata-cwl-class-extra="[^"]+"/g, "");
  // {item.field} and aria-label="Open {item.name}. {item.description}"
  t = t.replace(new RegExp(`\\{${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\}`, "g"), (_a, prop: string) => {
    const v = row[prop];
    return v == null ? "" : String(v);
  });
  // onclick={() => handleModuleClick(module)} → navigate via data-cwl-nav
  if (typeof row.path === "string" && row.path) {
    t = t.replace(
      /\s(?:onclick|on:click)=\{[^}]+\}/g,
      ` data-cwl-nav="${String(row.path).replace(/"/g, "")}"`,
    );
  }
  return t;
}

function expandControlFlow(
  source: string,
  loadBools: Readonly<Record<string, boolean>>,
  holes: SvelteMarkupLiftHole[],
  staticArrays: Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>> = {},
): string {
  let s = source;
  let guard = 0;
  while (guard++ < 500) {
    const block = findNextSvelteBlock(s, 0);
    if (block === null) break;
    let replacement = "";
    if (block.kind === "each") {
      const lit = /^\[([^\]]+)\]\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      const named =
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\([^)]*\))?$/.exec(
          block.header,
        );
      if (lit) {
        const items = lit[1]!.split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, ""));
        const itemName = lit[2]!;
        replacement = items
          .map((item) => block.trueBody.replace(new RegExp(`\\{${itemName}\\}`, "g"), item))
          .join("");
      } else if (named && staticArrays[named[1]!]?.length) {
        // Origin `const modules = […]` — expand rows (D6442/D6443), do not leave empty hole.
        const itemName = named[2]!;
        replacement = staticArrays[named[1]!]!
          .map((row) => expandEachTemplateForRow(block.trueBody, itemName, row))
          .join("\n");
      } else {
        pushHole(holes, HOLE_EACH, block.header.slice(0, 120));
        const cleanedInner = block.trueBody.replace(/\{[a-zA-Z_$][^}]*\}/g, "").trim();
        replacement = holeMarker(HOLE_EACH, block.header.slice(0, 120), cleanedInner);
      }
    } else {
      // if — resolve simple idents and !ident against loadBools (D6443 login form).
      const simple = /^([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      const negated = /^!\s*([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      if (/^true$/i.test(block.header)) {
        replacement = block.trueBody;
      } else if (/^false$/i.test(block.header)) {
        replacement = block.elseBody ?? "";
      } else if (
        negated &&
        Object.prototype.hasOwnProperty.call(loadBools, negated[1]!)
      ) {
        // `{#if !showPasswordReset}` must show the form when showPasswordReset is false —
        // never stampClosed the trueBody (that hid email/password on management login).
        const on = loadBools[negated[1]!] === true;
        replacement = !on ? block.trueBody : (block.elseBody ?? "");
      } else if (
        simple &&
        Object.prototype.hasOwnProperty.call(loadBools, simple[1]!)
      ) {
        const on = loadBools[simple[1]!] === true;
        if (isUiToggleOverlayIfHeader(block.header) && !on) {
          // Closed overlay chrome: keep markup hidden in DOM (D6442).
          replacement = stampClosedUiChrome(block.trueBody);
        } else {
          replacement = on ? block.trueBody : (block.elseBody ?? "");
        }
      } else if (isUiToggleOverlayIfHeader(block.header) && simple) {
        // Unknown show* — default closed chrome.
        replacement = stampClosedUiChrome(block.trueBody);
      } else if (isUiToggleOverlayIfHeader(block.header) && negated) {
        // Unknown !show* — assume show is false → main content visible.
        replacement = block.trueBody;
      } else {
        pushHole(holes, HOLE_IF, block.header.slice(0, 120));
        replacement = holeMarker(HOLE_IF, block.header.slice(0, 120), block.trueBody.trim());
      }
    }
    s = s.slice(0, block.start) + replacement + s.slice(block.end);
  }
  // Strip any leftover control tokens (orphans)
  if (/\{[#/@:]/.test(s)) {
    pushHole(holes, HOLE_RESIDUAL, "residual svelte control tokens stripped");
    s = s.replace(/\{[#/@:][^}]*\}/g, "");
  }
  return s;
}

function tryInlineStaticComponent(
  name: string,
  componentSources: ReadonlyMap<string, string> | undefined,
  staticInline: ReadonlySet<string>,
  loadBools: Readonly<Record<string, boolean>>,
  passthrough: ReadonlySet<string>,
  depth: number,
): string | null {
  if (depth > 3) return null;
  if (!staticInline.has(name) || !componentSources?.has(name)) return null;
  const path = componentSources.get(name)!;
  try {
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    const raw = readFileSync(path, "utf8");
    const lifted = liftStructuralSveltePageHtml(raw, {
      loadBools,
      applyShowcaseLoadBools: false,
      passthroughComponents: passthrough,
      componentSources,
      staticInlineComponents: staticInline,
      _inlineDepth: depth + 1,
    } as LiftStructuralSvelteOptions & { _inlineDepth?: number });
    if (lifted === null) return null;
    if (lifted.liftMode !== "static") return null;
    if (lifted.holes.length > 0) return null;
    return lifted.html;
  } catch {
    return null;
  }
}

/**
 * Inline panel markup allowing holes; wrap closed with hidden (D6442 / coverage-map).
 */
function tryInlineStructuralComponent(
  name: string,
  componentSources: ReadonlyMap<string, string> | undefined,
  structuralInline: ReadonlySet<string>,
  opts: LiftStructuralSvelteOptions & { _inlineDepth?: number },
  loadBools: Readonly<Record<string, boolean>>,
  passthrough: ReadonlySet<string>,
  depth: number,
): string | null {
  if (depth > 6) return null;
  if (!structuralInline.has(name) || !componentSources?.has(name)) return null;
  const path = componentSources.get(name)!;
  try {
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    const raw = readFileSync(path, "utf8");
    // Open `{#if show}` chrome so closed-source panels still lift into the DOM.
    const inlineBools = { ...loadBools, show: true };
    const lifted = liftStructuralSveltePageHtml(raw, {
      ...opts,
      loadBools: inlineBools,
      applyShowcaseLoadBools: false,
      passthroughComponents: passthrough,
      componentSources,
      structuralInlineComponents: structuralInline,
      _inlineDepth: depth + 1,
    } as LiftStructuralSvelteOptions & { _inlineDepth?: number });
    if (lifted === null || typeof lifted.html !== "string" || lifted.html.trim().length < 8) {
      return null;
    }
    const safe = name.replace(/"/g, "'");
    // Only stamp closed when the component itself gates chrome with `show`
    // (AddSiteModal, HelpModal, …). Nested panels like FilterPanel sit under a
    // page-level `{#if showFilters}` that already stamps the overlay — double
    // `hidden` would leave an empty open modal (D6443).
    const selfGated =
      /\bexport\s+let\s+show\b/.test(raw) || /\{#if\s+show(?:\s|&&|\})/.test(raw);
    const body = selfGated ? stampClosedUiChrome(lifted.html) : lifted.html;
    return `<div data-cwl-component="${safe}" data-cwl-lifted-component="${safe}">${body}</div>`;
  } catch {
    return null;
  }
}

/**
 * Apply the same literal expansions as static lift, then replace remaining
 * dynamic constructs with explicit hole markers.
 */
export function liftStructuralSveltePageHtml(
  source: string,
  loadBoolsOrOpts: Readonly<Record<string, boolean>> | LiftStructuralSvelteOptions = {},
): SvelteMarkupLiftResult | null {
  const opts: LiftStructuralSvelteOptions & { _inlineDepth?: number } =
    loadBoolsOrOpts !== null &&
    typeof loadBoolsOrOpts === "object" &&
    ("loadBools" in loadBoolsOrOpts ||
      "passthroughComponents" in loadBoolsOrOpts ||
      "applyShowcaseLoadBools" in loadBoolsOrOpts ||
      "componentSources" in loadBoolsOrOpts ||
      "staticInlineComponents" in loadBoolsOrOpts ||
      "structuralInlineComponents" in loadBoolsOrOpts ||
      "_inlineDepth" in loadBoolsOrOpts)
      ? (loadBoolsOrOpts as LiftStructuralSvelteOptions & { _inlineDepth?: number })
      : { loadBools: loadBoolsOrOpts as Readonly<Record<string, boolean>> };

  const showcase =
    opts.applyShowcaseLoadBools === true
      ? DEFAULT_SHOWCASE_LOAD_BOOLS
      : ({} as Record<string, boolean>);
  const scriptScalars = extractScriptScalarsFromSvelte(source);
  const loadBools = { ...showcase, ...scriptScalars.bools, ...(opts.loadBools ?? {}) };
  const scalarValues: Record<string, string | number | boolean> = {
    ...scriptScalars.scalars,
  };
  const passthrough = opts.passthroughComponents ?? DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS;
  const staticInline = opts.staticInlineComponents ?? DEFAULT_STATIC_INLINE_COMPONENTS;
  const structuralInline = opts.structuralInlineComponents ?? DEFAULT_STRUCTURAL_INLINE_COMPONENTS;
  const modalShell = opts.modalShellComponents ?? DEFAULT_MODAL_SHELL_COMPONENTS;
  const mapShell = opts.mapShellComponents ?? DEFAULT_MAP_SHELL_COMPONENTS;
  const chartShell = opts.chartShellComponents ?? DEFAULT_CHART_SHELL_COMPONENTS;
  const navShell = opts.navShellComponents ?? DEFAULT_NAV_SHELL_COMPONENTS;
  const wizardShell = opts.wizardShellComponents ?? DEFAULT_WIZARD_SHELL_COMPONENTS;
  const widgetShell = opts.widgetShellComponents ?? DEFAULT_WIDGET_SHELL_COMPONENTS;
  const inlineDepth = opts._inlineDepth ?? 0;

  const shellMarkupFor = (n: string): string | null => {
    if (modalShell.has(n)) return modalShellMarkup(n);
    if (mapShell.has(n)) return mapShellMarkup(n);
    if (chartShell.has(n)) return chartShellMarkup(n);
    if (navShell.has(n)) return navShellMarkup(n);
    if (wizardShell.has(n)) return wizardShellMarkup(n);
    if (widgetShell.has(n)) return widgetShellMarkup(n);
    return null;
  };

  const staticHtml = liftStaticSveltePageHtml(source, loadBools);
  if (staticHtml !== null) {
    return {
      html: staticHtml,
      classNames: extractHtmlClassNames(staticHtml),
      liftMode: "static",
      holes: [],
    };
  }

  const holes: SvelteMarkupLiftHole[] = [];
  let s = stripSvelteNonMarkup(source);

  // Literal @html strings
  s = s.replace(/\{@html\s+"([^"]*)"\s*\}/g, "$1");

  // Balanced if/each (fixes nested blocks that left orphan `{/if}` → fake `/if` interps)
  // Expand `{#each modules as module}` from origin `const modules = […]` (D6442/D6443).
  const staticArrays = extractConstObjectArraysFromSvelte(source);
  s = expandControlFlow(s, loadBools, holes, staticArrays);

  // Component tags (PascalCase) — brace-aware so `() =>` does not truncate (G9904)
  s = s.replace(/<\/([A-Z][A-Za-z0-9_]*)>/g, (_m, name) =>
    passthrough.has(String(name)) ? "" : "</div>",
  );
  {
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s[i] === "<" && /[A-Z]/.test(s[i + 1] ?? "")) {
        const nameMatch = /^<([A-Z][A-Za-z0-9_]*)/.exec(s.slice(i));
        const end = findPascalComponentTagEnd(s, i);
        if (nameMatch !== null && end !== null) {
          const n = nameMatch[1]!;
          const selfClosing = s.slice(end - 2, end) === "/>";
          if (passthrough.has(n)) {
            out += "";
          } else {
            const structural = tryInlineStructuralComponent(
              n,
              opts.componentSources,
              structuralInline,
              opts,
              loadBools,
              passthrough,
              inlineDepth,
            );
            if (structural !== null) {
              out += structural;
            } else {
              const shell = shellMarkupFor(n);
              if (shell !== null) {
                out += shell;
              } else {
                const inlined = tryInlineStaticComponent(
                  n,
                  opts.componentSources,
                  staticInline,
                  loadBools,
                  passthrough,
                  inlineDepth,
                );
                if (inlined !== null) {
                  out += inlined;
                } else {
                  pushHole(holes, HOLE_COMPONENT, n);
                  if (selfClosing) {
                    out += holeMarker(HOLE_COMPONENT, n);
                  } else {
                    const safe = n.replace(/"/g, "'");
                    out += `<div data-cwl-hole="${HOLE_COMPONENT}" data-cwl-hole-detail="${safe}" data-cwl-component="${safe}">`;
                  }
                }
              }
            }
          }
          i = end;
          continue;
        }
      }
      out += s[i];
      i++;
    }
    s = out;
  }

  // Event handlers and binds on attributes
  if (/\bon[a-z]+\s*=\s*\{/i.test(s) || /\bbind:[a-zA-Z]/.test(s)) {
    pushHole(holes, HOLE_EVENT, "event-or-bind attributes stripped");
  }
  s = s.replace(/\s+on[a-zA-Z]+\s*=\s*\{[^}]*\}/g, "");
  s = s.replace(/\s+bind:[a-zA-Z][a-zA-Z0-9_]*\s*=\s*\{[^}]*\}/g, "");
  s = s.replace(/\s+bind:[a-zA-Z][a-zA-Z0-9_]*/g, "");
  s = s.replace(/\s+transition:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+use:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+in:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+out:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+animate:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");

  if (/=\s*\{/.test(s) || /=\s*["'][^"']*\{/.test(s)) {
    pushHole(holes, HOLE_DIRECTIVE, "dynamic attributes stripped");
  }
  {
    let out = "";
    let i = 0;
    const attrRe = /\s+[a-zA-Z_:][\w:.-]*\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(s)) !== null) {
      out += s.slice(i, m.index);
      let depth = 0;
      let j = m.index + m[0].length - 1;
      for (; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
      attrRe.lastIndex = j;
    }
    out += s.slice(i);
    s = out;
  }
  {
    let out = "";
    let i = 0;
    const attrRe = /(\s+[a-zA-Z_:][\w:.-]*\s*=\s*)(["'])/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(s)) !== null) {
      const quote = m[2]!;
      const valueStart = m.index + m[0].length;
      let j = valueStart;
      while (j < s.length && s[j] !== quote) {
        if (s[j] === "\\") {
          j += 2;
          continue;
        }
        j++;
      }
      const value = s.slice(valueStart, j);
      out += s.slice(i, m.index);
      if (/\{/.test(value)) {
        const scrubbed = stripBalancedMustaches(value);
        if (scrubbed.length > 0) {
          out += `${m[1]}${quote}${scrubbed}${quote}`;
        }
      } else {
        out += s.slice(m.index, j + 1);
      }
      i = j + 1;
      attrRe.lastIndex = i;
    }
    out += s.slice(i);
    s = out;
  }

  // Text-node mustaches → holes (control tokens already removed)
  {
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s[i] !== "{") {
        out += s[i];
        i++;
        continue;
      }
      let depth = 0;
      let j = i;
      for (; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      const expr = s.slice(i + 1, j - 1).trim().slice(0, 80);
      if (expr.startsWith("#") || expr.startsWith("/") || expr.startsWith(":") || expr.startsWith("@")) {
        pushHole(holes, HOLE_RESIDUAL, expr.slice(0, 40));
        i = j;
        continue;
      }
      // Showcase settle: drop interp of known-false bools (empty error/loading text).
      if (Object.prototype.hasOwnProperty.call(loadBools, expr) && loadBools[expr] === false) {
        i = j;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(loadBools, expr) && loadBools[expr] === true) {
        out += "true";
        i = j;
        continue;
      }
      // Origin script scalars (const/let) — honest text, not invented.
      if (Object.prototype.hasOwnProperty.call(scalarValues, expr)) {
        out += String(scalarValues[expr]);
        i = j;
        continue;
      }
      // Event handler idents are not display text — omit (client wires separately).
      if (/^handle[A-Z][A-Za-z0-9_]*$/.test(expr) || /^\(\)\s*=>/.test(expr)) {
        i = j;
        continue;
      }
      // `flag ? 'a' : 'b'` / `flag ? ident : 'literal'` — settle when flag is known.
      const tern = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)$/.exec(expr);
      if (tern && Object.prototype.hasOwnProperty.call(loadBools, tern[1]!)) {
        const pick = (loadBools[tern[1]!] ? tern[2]! : tern[3]!).trim();
        const lit = /^(['"])([\s\S]*)\1$/.exec(pick);
        if (lit) {
          out += lit[2]!;
          i = j;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(loadBools, pick)) {
          if (loadBools[pick] === true) out += "true";
          i = j;
          continue;
        }
        // Unknown non-literal branch (e.g. loginTitle) — omit rather than hole when not chosen side needed;
        // if chosen side is bare ident, leave a hole.
        pushHole(holes, HOLE_INTERP, expr || "expr");
        out += holeMarker(HOLE_INTERP, expr || "expr");
        i = j;
        continue;
      }
      pushHole(holes, HOLE_INTERP, expr || "expr");
      out += holeMarker(HOLE_INTERP, expr || "expr");
      i = j;
    }
    s = out;
  }

  s = s.replace(/\s+[a-zA-Z_:][\w:.-]*\s*=\s*(?:""|'')?(?=[\s/>])/g, "");
  s = scrubStructuralMarkupArtifacts(s);
  s = s.trim().replace(/\n{3,}/g, "\n\n");
  if (s.length === 0 || !/<[a-z]/i.test(s)) return null;

  return {
    html: s,
    classNames: extractHtmlClassNames(s),
    liftMode: "structural-shell",
    holes,
  };
}
