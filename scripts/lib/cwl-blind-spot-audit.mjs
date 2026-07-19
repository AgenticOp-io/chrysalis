/**
 * Origin → CWL blind-spot audit.
 *
 * Catches conversion gaps that route/button censuses miss because the behavior
 * is not expressed as page markup or an on:click handler. Examples:
 *   - side-effectful +layout / module imports (ThemeManager, auth listeners)
 *   - global CSS import graphs (app.css → theme.css)
 *   - document/html attribute + class mutations
 *   - localStorage / sessionStorage keys
 *   - matchMedia / system preference listeners
 *   - external stylesheet swaps (ArcGIS themes)
 *   - browser platform APIs (Notification, clipboard, geolocation, WebSocket…)
 *   - singleton getInstance() / browser-gated module init
 *   - setContext / getContext, use:actions, transitions
 *   - PUBLIC_* / env-gated demo banners
 *   - third-party SDK boot (Firebase, ArcGIS)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

function slash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function walk(dir, accept, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".svelte-kit") continue;
      walk(path, accept, out);
    } else if (accept(path)) out.push(path);
  }
  return out;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function compact(value, limit = 220) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function extractScript(source) {
  const match = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  return match ? match[1] : source;
}

/** Patterns that describe origin behavior the converter historically drops. */
export const BLIND_SPOT_FAMILIES = [
  {
    id: "document-theme-attr",
    family: "document-mutation",
    priority: 96,
    origin: /document(?:\.documentElement)?\.setAttribute\s*\(\s*['"`]data-theme['"`]/,
    client: /data-theme|__wispTheme|setAttribute\s*\(\s*['"`]data-theme['"`]/,
    detail: "Origin mutates documentElement data-theme; CWL runtime must apply the same attribute.",
    suggestedConverterChange:
      "Compile ThemeManager / applyTheme into a global boot script that sets data-theme and light/dark classes.",
  },
  {
    id: "document-theme-class",
    family: "document-mutation",
    priority: 95,
    origin: /document(?:\.documentElement)?\.classList\.(?:add|remove|toggle)\s*\(\s*['"`](?:dark|light)['"`]/,
    client: /classList\.(?:add|remove|toggle)\s*\(\s*['"`](?:dark|light)['"`]|__wispTheme/,
    detail: "Origin toggles html.dark / html.light classes for theming.",
    suggestedConverterChange: "Mirror classList dark/light toggles in the global theme boot runtime.",
  },
  {
    id: "meta-theme-color",
    family: "document-mutation",
    priority: 90,
    origin: /meta\[name=["']theme-color["']\]|name\s*=\s*['"`]theme-color['"`]/,
    client: /theme-color|__wispTheme/,
    detail: "Origin updates meta[name=theme-color] when the theme resolves.",
    suggestedConverterChange: "Update theme-color meta from the theme boot runtime.",
  },
  {
    id: "external-stylesheet-swap",
    family: "asset-swap",
    priority: 94,
    origin: /esri\/themes\/(?:dark|light)\/main\.css|createElement\s*\(\s*['"`]link['"`][\s\S]{0,200}stylesheet/,
    client: /esri\/themes\/(?:dark|light)|wisp-arcgis-theme|__wispTheme/,
    detail: "Origin swaps external stylesheets (e.g. ArcGIS light/dark) based on resolved theme.",
    suggestedConverterChange: "Retain stylesheet swap logic in the global client / theme boot.",
  },
  {
    id: "matchmedia-system-theme",
    family: "system-preference",
    priority: 95,
    origin: /matchMedia\s*\(\s*['"`]\(prefers-color-scheme:\s*dark\)['"`]/,
    client: /matchMedia\s*\(\s*['"`]\(prefers-color-scheme:\s*dark\)|__wispTheme/,
    detail: "Origin listens to prefers-color-scheme for system theme mode.",
    suggestedConverterChange: "Keep a media-query listener when theme mode === system.",
  },
  {
    id: "localstorage-theme",
    family: "browser-storage",
    priority: 94,
    origin: /localStorage\.(?:get|set)Item\s*\(\s*['"`]theme(?:-mode)?['"`]/,
    client: /localStorage\.(?:get|set)Item\s*\(\s*['"`]theme(?:-mode)?['"`]|__wispTheme/,
    detail: "Origin persists theme preference in localStorage (theme-mode / theme).",
    suggestedConverterChange: "Persist and restore theme-mode (and legacy theme) keys in the CWL boot script.",
  },
  {
    id: "session-login-flag",
    family: "browser-storage",
    priority: 88,
    origin: /sessionStorage\.(?:get|set)Item\s*\(\s*['"`]wm_session_login_completed['"`]/,
    client: /wm_session_login_completed|isAuthenticated/,
    detail: "Root layout gates routes on sessionStorage wm_session_login_completed.",
    suggestedConverterChange: "Preserve the session login gate (or demo equivalent) in the global client.",
  },
  {
    id: "notification-api",
    family: "browser-api",
    priority: 80,
    origin: /Notification\.(?:requestPermission|permission)|requestBrowserNotifications/,
    client: /Notification\.|requestBrowserNotifications|browser notifications?/,
    detail: "Origin requests browser notifications.",
    suggestedConverterChange: "Handle Notification.requestPermission from converted notification chrome.",
  },
  {
    id: "clipboard-api",
    family: "browser-api",
    priority: 78,
    origin: /navigator\.clipboard|clipboard\.write(?:Text)?/,
    client: /navigator\.clipboard|clipboard\.write|copy to clipboard/,
    detail: "Origin copies values via the Clipboard API.",
    suggestedConverterChange: "Wire copy/clipboard actions in the CWL client.",
  },
  {
    id: "geolocation-api",
    family: "browser-api",
    priority: 78,
    origin: /navigator\.geolocation/,
    client: /navigator\.geolocation|geolocation|getCurrentPosition/,
    detail: "Origin reads navigator.geolocation.",
    suggestedConverterChange: "Port geolocation calls into the relevant module island.",
  },
  {
    id: "websocket",
    family: "browser-api",
    priority: 86,
    origin: /\b(?:new\s+)?WebSocket\b|wss?:\/\//,
    client: /WebSocket|wss?:\/\//,
    detail: "Origin opens WebSocket connections.",
    suggestedConverterChange: "Provide a CWL island or gateway proxy for live WebSocket streams.",
  },
  {
    id: "broadcast-channel",
    family: "browser-api",
    priority: 76,
    origin: /\bBroadcastChannel\b/,
    client: /BroadcastChannel/,
    detail: "Origin uses BroadcastChannel for cross-tab coordination.",
    suggestedConverterChange: "Replicate BroadcastChannel listeners in the global client when present in origin.",
  },
  {
    id: "service-worker",
    family: "browser-api",
    priority: 84,
    origin: /navigator\.serviceWorker|serviceWorker\.register/,
    client: /serviceWorker/,
    detail: "Origin registers a service worker.",
    suggestedConverterChange: "Decide whether to register the SW in CWL static hosting or document the intentional omission.",
  },
  {
    id: "visibility-lifecycle",
    family: "browser-api",
    priority: 74,
    origin: /visibilitychange|document\.visibilityState|beforeunload/,
    client: /visibilitychange|visibilityState|beforeunload/,
    detail: "Origin reacts to tab visibility / unload.",
    suggestedConverterChange: "Port visibility/unload listeners into the client island for pages that poll or warn on leave.",
  },
  {
    id: "postmessage",
    family: "browser-api",
    priority: 80,
    origin: /\.postMessage\s*\(/,
    client: /postMessage\s*\(/,
    detail: "Origin posts messages to iframes/windows.",
    suggestedConverterChange: "Retain postMessage bridges (e.g. Fit to Screen / map iframes) in the CWL client.",
  },
  {
    id: "history-mutation",
    family: "navigation",
    priority: 82,
    origin: /history\.(?:push|replace)State\s*\(|location\.hash\s*=/,
    client: /history\.(?:push|replace)State|location\.hash|data-cwl-nav/,
    detail: "Origin mutates history/hash outside SvelteKit goto().",
    suggestedConverterChange: "Compile history/hash mutations into the client router island.",
  },
  {
    id: "document-title",
    family: "document-mutation",
    priority: 70,
    origin: /document\.title\s*=/,
    client: /document\.title\s*=|<title>/,
    detail: "Origin sets document.title dynamically.",
    suggestedConverterChange: "Emit static titles per route and update document.title when route state changes.",
  },
  {
    id: "custom-event",
    family: "events",
    priority: 72,
    origin: /new\s+CustomEvent\s*\(|dispatchEvent\s*\(/,
    client: /CustomEvent|dispatchEvent|wisp-theme-change/,
    detail: "Origin dispatches DOM CustomEvents for cross-component coordination.",
    suggestedConverterChange: "Preserve CustomEvent names the modules listen for, or replace with an explicit shared bus.",
  },
  {
    id: "singleton-getinstance",
    family: "module-side-effect",
    priority: 92,
    origin: /\.getInstance\s*\(\s*\)/,
    client: /__wispTheme|getInstance|ThemeManager|AuthService|DarkMode/,
    detail: "Origin uses singleton getInstance() managers that initialize on import.",
    suggestedConverterChange: "Treat getInstance() modules imported by layouts as required global runtime, not dead code.",
  },
  {
    id: "browser-gated-init",
    family: "module-side-effect",
    priority: 91,
    origin: /\bbrowser\s*\?\s*[A-Za-z_$][\w$]*\.(?:getInstance|initialize|init)\s*\(/,
    client: /__wispTheme|ThemeManager|initialize|init\(/,
    detail: "Origin initializes managers only when browser === true at module scope.",
    suggestedConverterChange: "Compile browser-gated module initializers into the HTML boot script / global client.",
  },
  {
    id: "set-context",
    family: "svelte-runtime",
    priority: 85,
    origin: /\bsetContext\s*\(/,
    client: /setContext|wispSharedMap|data-cwl-island/,
    detail: "Origin provides Svelte context that child components consume.",
    suggestedConverterChange: "Replace setContext trees with an explicit shared runtime object on window or data attributes.",
  },
  {
    id: "get-context",
    family: "svelte-runtime",
    priority: 85,
    origin: /\bgetContext\s*\(/,
    client: /getContext|wispSharedMap|data-cwl-island/,
    detail: "Origin consumes Svelte context from an ancestor.",
    suggestedConverterChange: "Ensure every getContext consumer has an equivalent CWL shared-state provider.",
  },
  {
    id: "use-action",
    family: "svelte-runtime",
    priority: 83,
    origin: /\buse:[A-Za-z_$][\w$]*/,
    client: /data-cwl-action|data-cwl-island|use:/,
    detail: "Origin uses Svelte use:actions for DOM behavior.",
    suggestedConverterChange: "Lower use:actions into client helpers attached after hydration.",
  },
  {
    id: "transition-directive",
    family: "svelte-runtime",
    priority: 60,
    origin: /\b(?:transition|in|out|animate):[A-Za-z_$]/,
    client: /transition|animate|cwl-shell-open/,
    detail: "Origin uses transition/in/out/animate directives.",
    suggestedConverterChange: "Approximate transitions with CSS classes on shell open/close, or document intentional static omission.",
  },
  {
    id: "public-env-flag",
    family: "env-config",
    priority: 77,
    origin: /PUBLIC_[A-Z0-9_]+|isPublicFlagTrue\s*\(|import\.meta\.env/,
    client: /PUBLIC_|DEMO_SITE|demo@|isPublicFlag|import\.meta\.env/,
    detail: "Origin gates UI on PUBLIC_* / import.meta.env flags.",
    suggestedConverterChange: "Bake demo/public env flags into the gateway config and client boot.",
  },
  {
    id: "firebase-sdk",
    family: "third-party-sdk",
    priority: 93,
    origin: /firebase\/(?:app|auth|firestore)|initializeApp\s*\(|getAuth\s*\(/,
    client: /firebase|initializeApp|getAuth|signInWithEmailAndPassword|WispCwlApi/,
    detail: "Origin boots Firebase (auth/app).",
    suggestedConverterChange: "Keep Firebase client config + auth helpers in the CWL login/gateway path.",
  },
  {
    id: "arcgis-sdk",
    family: "third-party-sdk",
    priority: 90,
    origin: /@arcgis\/core|esri\/(?:Map|MapView|views)|loadModules\s*\(/,
    client: /@arcgis|esri\/|wisp-cwl-arcgis|wisp-cwl-map/,
    detail: "Origin loads ArcGIS JS API modules.",
    suggestedConverterChange: "Ensure map routes load the ArcGIS bundle / map island, not empty shells.",
  },
  {
    id: "global-css-import",
    family: "global-css",
    priority: 97,
    origin: /import\s+['"][^'"]*app\.css['"]|@import\s+['"][^'"]*theme\.css['"]/,
    client: /wisp-origin-global\.css|\[data-theme=["']dark["']\]|--color-background-primary/,
    detail: "Root layout / app.css imports a global theme stylesheet graph.",
    suggestedConverterChange: "Lift app.css → theme.css → modal.css as a global bundle on every route.",
    // Special: client probe also checks the lifted CSS file separately.
    probeCss: true,
  },
  {
    id: "css-var-runtime",
    family: "document-mutation",
    priority: 82,
    origin: /\.style\.setProperty\s*\(|documentElement\.style\.|setProperty\s*\(\s*['"`]--/,
    client: /setProperty\s*\(|style\.setProperty|__wispTheme/,
    detail: "Origin sets CSS custom properties at runtime.",
    suggestedConverterChange: "Port runtime CSS variable writes into the theme/branding island.",
  },
  {
    id: "bind-this-measure",
    family: "svelte-runtime",
    priority: 75,
    origin: /\bbind:this\b|\bbind:clientWidth\b|\bbind:clientHeight\b|\bbind:offsetWidth\b|\bbind:contentRect\b/,
    client: /data-cwl-island|getBoundingClientRect|clientWidth|ResizeObserver/,
    detail: "Origin binds element refs or layout measurements (bind:this / clientWidth).",
    suggestedConverterChange: "Replace measurement binds with ResizeObserver or explicit refs in the client island.",
  },
  {
    id: "file-reader",
    family: "browser-api",
    priority: 81,
    origin: /\bFileReader\b|createObjectURL\s*\(|webkitdirectory|type=["']file["']/,
    client: /FileReader|createObjectURL|type=["']file["']|input.*file|data-cwl-action=["']file/,
    detail: "Origin reads local files / object URLs (imports, uploads, CSV).",
    suggestedConverterChange: "Keep file-input and FileReader flows in the converted import/upload handlers.",
  },
  {
    id: "drag-drop",
    family: "browser-api",
    priority: 76,
    origin: /\bondrag|\bon:drag|dataTransfer|dragover|drop\s*=/,
    client: /drag|drop|dataTransfer/,
    detail: "Origin implements drag-and-drop.",
    suggestedConverterChange: "Wire drag/drop listeners in the relevant module island.",
  },
  {
    id: "media-devices",
    family: "browser-api",
    priority: 80,
    origin: /mediaDevices|getUserMedia|enumerateDevices/,
    client: /mediaDevices|getUserMedia|camera|start camera/,
    detail: "Origin uses camera/microphone MediaDevices APIs.",
    suggestedConverterChange: "Retain getUserMedia handling for scanner/camera controls.",
  },
  {
    id: "mutation-observer",
    family: "browser-api",
    priority: 73,
    origin: /\bMutationObserver\b/,
    client: /MutationObserver/,
    detail: "Origin observes DOM mutations.",
    suggestedConverterChange: "Port MutationObserver setup into the page client island when it drives UI.",
  },
  {
    id: "intersection-observer",
    family: "browser-api",
    priority: 73,
    origin: /\bIntersectionObserver\b/,
    client: /IntersectionObserver/,
    detail: "Origin uses IntersectionObserver (lazy load / infinite scroll).",
    suggestedConverterChange: "Port IntersectionObserver usage into the client island.",
  },
  {
    id: "print-flow",
    family: "browser-api",
    priority: 70,
    origin: /\bwindow\.print\s*\(|@media\s+print/,
    client: /window\.print|@media print|print/,
    detail: "Origin supports print flows.",
    suggestedConverterChange: "Keep window.print actions and print CSS in the export.",
  },
  {
    id: "intl-locale",
    family: "i18n",
    priority: 68,
    origin: /\bIntl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat)\b|navigator\.language/,
    client: /Intl\.|navigator\.language|toLocaleString/,
    detail: "Origin formats values with Intl / navigator.language.",
    suggestedConverterChange: "Preserve locale-aware formatting in hydrated list/table renderers.",
  },
  {
    id: "crypto-random",
    family: "browser-api",
    priority: 65,
    origin: /crypto\.randomUUID|crypto\.getRandomValues|crypto\.subtle/,
    client: /crypto\.randomUUID|crypto\.getRandomValues|crypto\.subtle|Math\.random/,
    detail: "Origin uses Web Crypto for IDs/secrets.",
    suggestedConverterChange: "Keep crypto.randomUUID / getRandomValues in generate-key actions.",
  },
];

/**
 * Scan a source file for blind-spot family hits.
 * @param {string} source
 * @param {string} file
 */
export function scanBlindSpotHits(source, file) {
  /** @type {Array<{id:string,family:string,file:string,line:number,snippet:string}>} */
  const hits = [];
  const script = file.endsWith(".svelte") ? extractScript(source) : source;
  for (const family of BLIND_SPOT_FAMILIES) {
    const re = new RegExp(family.origin.source, family.origin.flags.includes("g") ? family.origin.flags : `${family.origin.flags}g`);
    for (const match of script.matchAll(re)) {
      const at = source.indexOf(match[0]);
      hits.push({
        id: family.id,
        family: family.family,
        file,
        line: lineAt(source, at >= 0 ? at : match.index || 0),
        snippet: compact(match[0]),
      });
      // One hit per family per file is enough for inventory; keep scanning other families.
      break;
    }
    // Also scan markup for use:/transition: which live outside <script>
    if (file.endsWith(".svelte") && (family.id === "use-action" || family.id === "transition-directive")) {
      if (family.origin.test(source) && !hits.some((h) => h.id === family.id && h.file === file)) {
        hits.push({
          id: family.id,
          family: family.family,
          file,
          line: lineAt(source, source.search(family.origin)),
          snippet: compact(source.match(family.origin)?.[0] || family.id),
        });
      }
    }
  }
  return hits;
}

/** Origin symbol → CWL coverage probes (any match means "ported under another name"). */
export const SIDE_EFFECT_COVERAGE_ALIASES = {
  themeManager: /__wispTheme|theme-mode|data-theme|apply theme|ThemeManager/,
  ThemeManager: /__wispTheme|theme-mode|data-theme|apply theme|ThemeManager/,
  themeStore: /__wispTheme|theme-mode|data-theme|apply theme/,
  setTheme: /__wispTheme|apply theme|setTheme/,
  toggleTheme: /__wispTheme|toggle theme|toggleTheme/,
  darkModeManager: /__wispTheme|data-theme|darkMode/,
  authService: /firebase|getAuth|signInWithEmailAndPassword|isAuthenticated|wm_session_login|authService/,
  AuthService: /firebase|getAuth|signInWithEmailAndPassword|isAuthenticated/,
  tenantStore: /tenantId|X-Tenant|currentTenant|tenant-store|\/api\/tenants|tenantStore/,
  currentTenant: /tenantId|X-Tenant|currentTenant|\/api\/tenants/,
  DemoSiteBanner: /DemoSiteBanner|demo-site-banner|demo-visitor|PUBLIC_DEMO_SITE|Demo site/i,
  isPlatformAdmin: /platform.?admin|hasPlatformAdminAccess|isPlatformAdmin/i,
  portalBranding: /portalBranding|portal-branding|branding/i,
  brandingService: /brandingService|portal-branding|branding/i,
  customerAuthService: /customerAuth|portal.*login|customer.*auth|customers\/portal|portal\/login/i,
  isPublicFlagTrue: /PUBLIC_|DEMO_SITE|isPublicFlag/,
  isSimpleLoginOnly: /simple.?login|isSimpleLogin|demo@/i,
  isSingleTenantMode: /single.?tenant|isSingleTenant/i,
};

/**
 * Only layout files contribute blocking side-effect-import gaps.
 * lib/services importing authService is normal dependency wiring, not a converter miss.
 */
function isLayoutFile(file) {
  return /(^|\/)\+layout\.svelte$/.test(file) || /(^|\/)\+layout\.[jt]s$/.test(file);
}

function importCovered(name, from, runtimeBlob, exportProbe = "") {
  const token = String(name || "")
    .replace(/^type\s+/, "")
    .trim();
  if (!token || token === "type") return true;
  if (/^type\b/i.test(String(name || ""))) return true; // type-only import
  const alias = SIDE_EFFECT_COVERAGE_ALIASES[token];
  if (alias && (alias.test(runtimeBlob) || alias.test(exportProbe))) return true;
  if (/\.css(?:\?|$)/i.test(from)) {
    return /wisp-origin-global\.css|original-css|\[data-theme=["']dark["']\]/.test(runtimeBlob);
  }
  // Exact symbol still present under the same name.
  const needle = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return needle.test(runtimeBlob) || needle.test(exportProbe);
}

/**
 * Side-effectful imports from +layout / manager modules.
 * @param {string} source
 * @param {string} file
 */
export function scanSideEffectImports(source, file) {
  /** @type {Array<{file:string,line:number,name:string,from:string,kind:string}>} */
  const rows = [];
  const importRe =
    /import\s+(?:type\s+)?(?:(\w+)\s*,\s*)?(?:\{([^}]*)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(importRe)) {
    const typeOnlyImport = /^\s*import\s+type\b/.test(match[0]);
    const names = [
      ...(match[2]
        ? match[2].split(",").map((p) => {
            const part = p.trim();
            if (!part || /^type\b/.test(part)) return "";
            return part.replace(/^type\s+/, "").split(/\s+as\s+/).pop();
          })
        : []),
      match[1],
      match[4],
    ]
      .filter(Boolean)
      .map((n) => String(n).trim())
      .filter(Boolean);
    const from = match[5];
    for (const name of names) {
      if (typeOnlyImport) continue;
      const looksManager =
        /(Manager|Service|Store|Client|Provider|Auth|Theme|DarkMode|Banner)/i.test(name) ||
        /(Manager|Service|Store|Client|Provider|auth|theme|darkMode)/i.test(from);
      const cssImport = /\.css(?:\?[^'"]*)?$/i.test(from);
      if (!looksManager && !cssImport) continue;
      rows.push({
        file,
        line: lineAt(source, match.index),
        name,
        from,
        kind: cssImport ? "css-import" : "side-effect-import",
      });
    }
  }
  return rows;
}

/**
 * Storage keys written/read in origin — converter must know which persist.
 * @param {string} source
 * @param {string} file
 */
export function scanStorageKeys(source, file) {
  /** @type {Array<{file:string,line:number,store:string,op:string,key:string}>} */
  const rows = [];
  const re =
    /\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem)\s*\(\s*(['"`])([^'"`]+)\3/g;
  for (const match of source.matchAll(re)) {
    rows.push({
      file,
      line: lineAt(source, match.index),
      store: match[1],
      op: match[2],
      key: match[4],
    });
  }
  return rows;
}

/**
 * @param {object} opts
 * @param {string} opts.sourceDir Module_Manager/src
 * @param {string} opts.exportDir cwl-static-export
 * @param {string} [opts.fixtureDir]
 * @param {string} [opts.clientSource]
 * @param {string} [opts.gatewaySource]
 * @param {string} [opts.globalCssSource]
 */
export function runBlindSpotAudit(opts) {
  const sourceDir = opts.sourceDir;
  const exportDir = opts.exportDir;
  const fixtureDir = opts.fixtureDir || dirname(exportDir);
  const clientSource =
    opts.clientSource ||
    (existsSync(join(fixtureDir, "wisp-cwl-client.js"))
      ? readFileSync(join(fixtureDir, "wisp-cwl-client.js"), "utf8")
      : "");
  const modulesSource = existsSync(join(fixtureDir, "wisp-cwl-modules.js"))
    ? readFileSync(join(fixtureDir, "wisp-cwl-modules.js"), "utf8")
    : "";
  const gatewaySource =
    opts.gatewaySource ||
    (existsSync(join(dirname(dirname(fixtureDir)), "scripts/lib/cwl-chimera-gateway.mjs"))
      ? readFileSync(join(dirname(dirname(fixtureDir)), "scripts/lib/cwl-chimera-gateway.mjs"), "utf8")
      : existsSync(join(fixtureDir, "../..", "scripts/lib/cwl-chimera-gateway.mjs"))
        ? readFileSync(join(fixtureDir, "../..", "scripts/lib/cwl-chimera-gateway.mjs"), "utf8")
        : "");
  const globalCssSource =
    opts.globalCssSource ||
    (existsSync(join(fixtureDir, "original-css/wisp-origin-global.css"))
      ? readFileSync(join(fixtureDir, "original-css/wisp-origin-global.css"), "utf8")
      : "");

  const runtimeBlob = [clientSource, modulesSource, gatewaySource, globalCssSource].join("\n");

  const files = walk(
    sourceDir,
    (path) => [".svelte", ".ts", ".js", ".css"].includes(extname(path)),
  ).sort((a, b) => slash(a).localeCompare(slash(b)));

  /** @type {Array<{id:string,family:string,file:string,line:number,snippet:string}>} */
  const hits = [];
  /** @type {Array<{file:string,line:number,name:string,from:string,kind:string}>} */
  const sideEffectImports = [];
  /** @type {Array<{file:string,line:number,store:string,op:string,key:string}>} */
  const storageKeys = [];

  const layoutFiles = [];
  for (const absolute of files) {
    const file = slash(relative(sourceDir, absolute));
    const source = readFileSync(absolute, "utf8");
    if (/(^|\/)\+layout\.svelte$/.test(file) || /(^|\/)\+layout\.[jt]s$/.test(file)) {
      layoutFiles.push(file);
      sideEffectImports.push(...scanSideEffectImports(extractScript(source), file));
    }
    // Also scan lib/stores and lib services for module-level managers.
    if (/^lib\/(stores|services|config|utils)\//.test(file) && /\.(ts|js)$/.test(file)) {
      sideEffectImports.push(...scanSideEffectImports(source, file));
    }
    hits.push(...scanBlindSpotHits(source, file));
    storageKeys.push(...scanStorageKeys(source, file));
  }

  // Deduplicate storage keys for the inventory.
  const storageKeyInventory = [...new Set(storageKeys.map((r) => `${r.store}:${r.key}`))]
    .sort()
    .map((id) => {
      const [store, key] = id.split(":");
      const samples = storageKeys.filter((r) => r.store === store && r.key === key);
      return { store, key, files: [...new Set(samples.map((s) => s.file))].slice(0, 8), count: samples.length };
    });

  const hitsById = new Map();
  for (const hit of hits) {
    const list = hitsById.get(hit.id) || [];
    list.push(hit);
    hitsById.set(hit.id, list);
  }

  // Sample exported HTML so component shells (DemoSiteBanner, etc.) count as covered.
  let exportProbe = "";
  try {
    const sampleRoutes = ["dashboard", "login", "modules/plan", "modules/deploy"];
    for (const route of sampleRoutes) {
      const htmlPath = join(exportDir, ...route.split("/"), "index.html");
      if (existsSync(htmlPath)) exportProbe += readFileSync(htmlPath, "utf8") + "\n";
    }
  } catch {
    exportProbe = "";
  }

  /** @type {Array<object>} */
  const gaps = [];
  /** Inventory-only notes (non-blocking) for converters to triage. */
  const inventory = [];

  for (const family of BLIND_SPOT_FAMILIES) {
    const originHits = hitsById.get(family.id) || [];
    if (!originHits.length) continue;

    let covered = family.client.test(runtimeBlob) || family.client.test(exportProbe);
    if (family.probeCss) {
      covered =
        covered ||
        (/\[data-theme=["']dark["']\]/.test(globalCssSource) &&
          /--color-background-primary/.test(globalCssSource));
    }
    if (covered) continue;

    const sampleFiles = [...new Set(originHits.map((h) => h.file))].slice(0, 6);
    gaps.push({
      priority: family.priority,
      file: sampleFiles[0] || "(unknown)",
      route: layoutFiles.includes(sampleFiles[0])
        ? "*"
        : sampleFiles[0]?.startsWith("routes/")
          ? "(derived)"
          : "*",
      kind: `missing-blind-spot:${family.id}`,
      family: family.family,
      detail: `${family.detail} Origin hits in ${originHits.length} file(s): ${sampleFiles.join(", ")}.`,
      suggestedConverterChange: family.suggestedConverterChange,
      originHitCount: originHits.length,
      originFiles: sampleFiles,
    });
  }

  // Layout side-effect imports — inventory everything; only gap when layout
  // imports a manager/CSS with no CWL coverage alias.
  for (const row of sideEffectImports) {
    const covered = importCovered(row.name, row.from, runtimeBlob, exportProbe);
    const layout = isLayoutFile(row.file);
    const entry = {
      priority: layout ? 98 : 70,
      file: row.file,
      route: "*",
      kind: row.kind === "css-import" ? "missing-layout-css-import" : "missing-layout-side-effect-import",
      family: "module-side-effect",
      detail: `${layout ? "Layout" : "Module"} imports ${row.name} from ${row.from} (line ${row.line})${
        covered ? " — covered by CWL alias/runtime." : " but the CWL runtime/CSS bundle does not cover it."
      }`,
      suggestedConverterChange:
        row.kind === "css-import"
          ? "Lift the imported stylesheet into the global original-css bundle and link it on every page."
          : "Compile the imported manager/service initialization into the global client boot (do not drop side-effect-only imports).",
      originHitCount: 1,
      originFiles: [row.file],
      covered,
    };
    if (covered) {
      inventory.push(entry);
      continue;
    }
    // Non-layout service dependency imports are inventory only.
    if (!layout) {
      inventory.push(entry);
      continue;
    }
    gaps.push(entry);
  }

  // Storage keys: theme/session are blocking when missing; others are inventory.
  for (const row of storageKeyInventory) {
    const re = new RegExp(
      `['"\`]${row.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]`,
    );
    if (re.test(runtimeBlob) || re.test(exportProbe)) continue;
    const critical = /^(theme(?:-mode)?|wm_session_login_completed|isAuthenticated)$/i.test(row.key);
    const entry = {
      priority: critical ? 94 : 72,
      file: row.files[0] || "(storage)",
      route: "*",
      kind: "missing-storage-key",
      family: "browser-storage",
      detail: `Origin uses ${row.store} key "${row.key}" (${row.count} refs) but CWL runtime never reads/writes it.`,
      suggestedConverterChange: `Persist and restore ${row.store}["${row.key}"] in the global client boot or the relevant island.`,
      originHitCount: row.count,
      originFiles: row.files,
    };
    if (critical) gaps.push(entry);
    else inventory.push(entry);
  }

  gaps.sort(
    (a, b) =>
      b.priority - a.priority ||
      String(a.kind).localeCompare(String(b.kind)) ||
      String(a.file).localeCompare(String(b.file)),
  );

  const familyCounts = {};
  for (const hit of hits) {
    familyCounts[hit.family] = (familyCounts[hit.family] || 0) + 1;
  }

  return {
    ok: gaps.filter((g) => g.priority >= 90).length === 0,
    layoutFiles,
    familyCounts,
    hitCount: hits.length,
    hits: hits.slice(0, 500),
    sideEffectImports,
    storageKeyInventory,
    inventory: inventory.slice(0, 200),
    gaps,
    blockingGaps: gaps.filter((g) => g.priority >= 90),
    summary: {
      layoutCount: layoutFiles.length,
      blindSpotHitCount: hits.length,
      sideEffectImportCount: sideEffectImports.length,
      storageKeyCount: storageKeyInventory.length,
      inventoryCount: inventory.length,
      gapCount: gaps.length,
      blockingGapCount: gaps.filter((g) => g.priority >= 90).length,
      familiesTracked: BLIND_SPOT_FAMILIES.map((f) => f.id),
    },
  };
}
