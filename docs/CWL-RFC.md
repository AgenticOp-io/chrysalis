# Chrysalis Web Language (CWL) — RFC index (Convert mirror)

> **Non-SoR.** This file and `docs/CWL-RFC-0*.md` under Convert are **historical mirrors / consume notes**.  
> **Canonical RFC index and all tip RFCs (including 0023–0045):**  
> [`chrysalis-cwl/docs/language/CWL-RFC.md`](../../chrysalis-cwl/docs/language/CWL-RFC.md)  
> Convert tip pin **1.0.88** DNA ladder: DOC-MAP §3 · [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md).  
> Do **not** deepen language RFCs here — edit **chrysalis-cwl**, then sync junctions.

CWL evolves by **RFC**: each proposal must cite cross-language evidence (path knowledge, gold suites, or oracle traces) and lower to WebIR without a second IR.

| RFC | Title | Status (mirror) |
| --- | --- | --- |
| [0001](CWL-RFC-0001-module-use-middleware.md) | Module `use json` / `use urlencoded` | accepted (mirror) |
| [0002](CWL-RFC-0002-path-parameters.md) | Path parameters (`:id` templates) | accepted (mirror) |
| [0003](CWL-RFC-0003-query-parameters.md) | Query parameters (`query name;`) | accepted (mirror) |
| [0004](CWL-RFC-0004-request-context.md) | Headers and cookies | accepted (mirror) |
| [0005](CWL-RFC-0005-request-body.md) | JSON request body fields | accepted (mirror) |
| [0006](CWL-RFC-0006-response-status.md) | Response status | accepted (mirror) |
| [0007](CWL-RFC-0007-auth-effects.md) | Auth presets and effects | accepted (mirror) |
| [0008](CWL-RFC-0008-response-content-type.md) | Response content-type | accepted (mirror) |
| [0009](CWL-RFC-0009-multi-file-modules.md) | Multi-file modules (`import`) | accepted (mirror) |
| [0010](CWL-RFC-0010-full-stack-pages.md) | Full-stack page surface (`@page`, `return html`) | accepted (mirror) |
| [0011](CWL-RFC-0011-full-stack-layouts.md) | Layout imports + page params | accepted (mirror) |
| [0012](CWL-RFC-0012-full-stack-components.md) | Full-stack component holes (SvelteKit) | accepted (mirror) |
| [0013](CWL-RFC-0013-page-load-functions.md) | Page load / SSR data (`+page.server`) | accepted (mirror; TBD sections → CWL SoR) |
| [0014](CWL-RFC-0014-html-interpolation.md) | HTML interpolation in `@page` | accepted (mirror) |
| [0015](CWL-RFC-0015-production-readiness-probes.md) | Production readiness probes | accepted (mirror) |
| [0016](CWL-RFC-0016-form-action-probe.md) | Form action probe + hole catalog | accepted (mirror) |
| [0017](CWL-RFC-0017-native-ui-v0.md) | Native UI v0 (`return ui`, `data.ui.tree`) | accepted (mirror) |
| [0018](CWL-RFC-0018-native-ui-components.md) | Native UI components (`@component`) | accepted (mirror) |
| [0019](CWL-RFC-0019-native-ui-v1.md) | Native UI v1 (client islands, events) | accepted (mirror) |
| [0020](CWL-RFC-0020-effects-middleware.md) | Effects middleware chains | accepted (mirror) |
| [0021](CWL-RFC-0021-early-exit-cond-expr.md) | Early-exit cond expressions + opaque call/member/empty residual + foreach bind | accepted (mirror) |
| [0022](CWL-RFC-0022-dna-surface-bridge.md) | DNA surface bridge | **pointer only** → CWL SoR |

**Not mirrored in Convert (read CWL):** RFC-0023 … RFC-0045 (deploy profiles through DNA proof units). Tip **1.0.85–1.0.88** → RFC-0042 … RFC-0045.

**Process (language changes)**

1. Open/edit RFC under **`chrysalis-cwl/docs/language/`** with motivation, syntax, WebIR mapping, and verify plan.
2. Add parser + language-gold in **chrysalis-cwl**; Convert peels via junctions + `hub:genome-deepen-peel-smoke`.
3. Record Convert pin follow-ups in `DESIGN.md` (D65xx tip follows) and [`CONVERT-CWL-CONSUME.md`](./CONVERT-CWL-CONSUME.md).
