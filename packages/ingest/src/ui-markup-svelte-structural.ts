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
  showCreateModal: false,
  showEditModal: false,
  showDeleteConfirm: false,
  showDeleteModal: false,
  showAssignOwnerModal: false,
  showUsersModal: false,
  showPlanDraftMenu: false,
  loadingAgents: false,
  loadingUsers: false,
  saving: false,
  isSaving: false,
  isLoggedIn: true,
  isAdmin: true,
  autoRefresh: false,
};

/** Components safe to inline when their lift is fully static (no nested holes). */
export const DEFAULT_STATIC_INLINE_COMPONENTS: ReadonlySet<string> = new Set([
  "TopBrand",
  "DemoSiteBanner",
  "AdminBreadcrumb",
]);

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
  while (j < source.length) {
    const ch = source[j]!;
    if (quote !== null) {
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) quote = null;
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

function expandControlFlow(
  source: string,
  loadBools: Readonly<Record<string, boolean>>,
  holes: SvelteMarkupLiftHole[],
): string {
  let s = source;
  let guard = 0;
  while (guard++ < 500) {
    const block = findNextSvelteBlock(s, 0);
    if (block === null) break;
    let replacement = "";
    if (block.kind === "each") {
      const lit = /^\[([^\]]+)\]\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      if (lit) {
        const items = lit[1]!.split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, ""));
        const itemName = lit[2]!;
        replacement = items
          .map((item) => block.trueBody.replace(new RegExp(`\\{${itemName}\\}`, "g"), item))
          .join("");
      } else {
        pushHole(holes, HOLE_EACH, block.header.slice(0, 120));
        const cleanedInner = block.trueBody.replace(/\{[a-zA-Z_$][^}]*\}/g, "").trim();
        replacement = holeMarker(HOLE_EACH, block.header.slice(0, 120), cleanedInner);
      }
    } else {
      // if
      if (/^true$/i.test(block.header)) {
        replacement = block.trueBody;
      } else if (/^false$/i.test(block.header)) {
        replacement = block.elseBody ?? "";
      } else {
        const simple = /^([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
        if (simple && Object.prototype.hasOwnProperty.call(loadBools, simple[1]!)) {
          replacement = loadBools[simple[1]!] ? block.trueBody : (block.elseBody ?? "");
        } else {
          pushHole(holes, HOLE_IF, block.header.slice(0, 120));
          replacement = holeMarker(HOLE_IF, block.header.slice(0, 120), block.trueBody.trim());
        }
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
      "_inlineDepth" in loadBoolsOrOpts)
      ? (loadBoolsOrOpts as LiftStructuralSvelteOptions & { _inlineDepth?: number })
      : { loadBools: loadBoolsOrOpts as Readonly<Record<string, boolean>> };

  const showcase =
    opts.applyShowcaseLoadBools === true
      ? DEFAULT_SHOWCASE_LOAD_BOOLS
      : ({} as Record<string, boolean>);
  const loadBools = { ...showcase, ...(opts.loadBools ?? {}) };
  const passthrough = opts.passthroughComponents ?? DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS;
  const staticInline = opts.staticInlineComponents ?? DEFAULT_STATIC_INLINE_COMPONENTS;
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
  s = expandControlFlow(s, loadBools, holes);

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
