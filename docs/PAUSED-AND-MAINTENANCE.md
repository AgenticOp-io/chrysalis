# Paused backlog and active build queue

> **Status:** authoritative (2026-07-06) — Phase 46 closed (**G9290**, **D6343**); Phase 45 closed (**G9190**); Phase 44 closed (**G9140**)  
> **Purpose:** Index for **maintenance**, **closed programs**, and **remaining honest gaps**.  
> **Active operator stack:** [`MIGRATION-OS.md`](./MIGRATION-OS.md) — start there, not here, if you are new.

**Do not treat closed program tables in `ROADMAP.md` or [`archive/STRATEGIC-PLAN-SHIPPED-LOG.md`](./archive/STRATEGIC-PLAN-SHIPPED-LOG.md) as active backlog.**  
**Historical phase docs:** [`archive/INDEX.md`](./archive/INDEX.md).

---

## 1. Default queue today

When the user says **"build"** without scope, prefer [`STRATEGIC-PLAN.md`](./STRATEGIC-PLAN.md) §12. Summary:

| Priority | Gate | Smoke |
| --- | --- | --- |
| **Migration OS composite** | **G8550** | `hub:migration-os-close-smoke` · GCE: `test:gce:migration-os` |
| **Open Legacy wedge** | **G8570** | `hub:site-port-open-legacy-wedge-smoke` |
| **CWL IR helper tier** | **G6731** | `hub:cwl-language-maintenance-smoke` (weekly CI) |
| **WISP showcase (default CI)** | **G9170** | `hub:phase45-wisp-showcase-smoke` |
| **Extended matrix census** | **G9160** | `hub:extended-matrix-oracle-progress-smoke` — **421** pairs below oracle-product |

**One-command demo:** `pnpm run migration-evidence:demo`  
**Closed program regression:** `hub:phase46-program-close-smoke` (**G9290**) · `hub:phase45-program-close-smoke` (**G9190**) · `hub:phase44-program-close-smoke` (**G9140**) · `hub:ir-helper-program-close-smoke` (**G7200**) · `hub:full-matrix-oracle-close-smoke` (**G8790`) · `hub:llm-assisted-convert-close-smoke` (**G8830**) · `hub:llm-convert-full-close-smoke` (**G8940`) · `hub:wisp-web-llm-poc-close-smoke` · `hub:open-web-llm-close-smoke` · `hub:is-runtime-close-smoke`  
**Program docs:** [`PHASE-46-PROGRAM.md`](./PHASE-46-PROGRAM.md) · [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md) · [`MIGRATION-OS.md`](./MIGRATION-OS.md)

### Subordinate (closed — regression only)

| Gate | Smoke | Doc |
| --- | --- | --- |
| **G8100** WISP CWL UI parity | `hub:wisp-cwl-ui-parity-close-smoke` | [`WISP-CWL-UI-PARITY-PROGRAM.md`](./WISP-CWL-UI-PARITY-PROGRAM.md) |
| **G7990** WISP production completion | `hub:wisp-production-completion-close-smoke` | [`WISP-PRODUCTION-COMPLETION-PROGRAM.md`](./WISP-PRODUCTION-COMPLETION-PROGRAM.md) |
| **G7890** / **G7790** | Composed in **G7990** | [`archive/INDEX.md`](./archive/INDEX.md) |
| **G6731** / **G7200** IR helper | `hub:cwl-language-maintenance-smoke` | [`IR-HELPER-PROGRAM.md`](./IR-HELPER-PROGRAM.md) |

**Governance:** `pnpm run hub:maintenance-mode-governance-smoke` (**G6160** / **G7991**)

| Trigger | Action |
| --- | --- |
| Bug fix / CI red | Fix regression; run relevant smoke |
| Parser gap | Hole + fixture per `AGENTS.md` §4 |

### 1b. G6731 composite — CWL language maintenance (G6732 doc index)

Regression: `hub:cwl-language-maintenance-smoke` (**G6731**). Tier close: `hub:ir-helper-program-close-smoke` (**G7200**). Detail: [`CWL-LANGUAGE-PROGRAM.md`](./CWL-LANGUAGE-PROGRAM.md) · [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md).

| Gate | Helper | Gate | Helper |
| --- | --- | --- | --- |
| **G6750** language v1 close | — | **G6760** B9 `count()` | **G6770** B10 `is_array()` |
| **G6780** B11 `is_string()` | **G6790** B12 `abs()` | **G6800** B13 `is_numeric()` | **G6810** B14 logical `!` |
| **G6820** B15 `is_int()` | **G6830** B16 `is_bool()` | **G6840** B17 `is_null()` | **G6850** B18 unary `-` |
| **G6860** B19 `round()` | **G6870** B20 `floor()` | **G6880** B21 `ceil()` | **G6890** B22 `strtolower()` |
| **G6900** B23 `strtoupper()` | **G6910** B24 `htmlspecialchars()` | **G6920** B25 `nl2br()` | **G6930** B26 `urlencode()` |
| **G6940** B27 `rawurlencode()` | **G6950** B28 `urldecode()` | **G6960** B29 `rawurldecode()` | **G6970** B30 `ltrim()` |
| **G6980** B31 `rtrim()` | **G6990** B32 `is_float()` | **G7000** B33 `is_object()` | **G7010** B34 `is_scalar()` |
| **G7020** B35 `round(, precision)` | **G7030** B36 `max()` | **G7040** B37 `min()` | **G7050** B38 `substr()` |
| **G7060** B39 `strpos()` | **G7070** B40 `stripos()` | **G7080** B41 `strrpos()` | **G7090** B42 `strripos()` |
| **G7091** B43 `str_contains()` | **G7092** B44 `str_starts_with()` | **G7093** B45 `str_ends_with()` | **G7094** B46 `substr_count()` |
| **G7095** B47 `explode()` | **G7096** B48 `strcmp()` | **G7097** B49 `strcasecmp()` | **G7098** B50 `strncmp()` |
| **G7099** B51 `strncasecmp()` | **G7102** B52 `strrev()` | **G7103** B53 `str_repeat()` | **G7104** B54 `str_pad()` |
| **G7105** B55 `str_replace()` | **G7106** B56 `str_ireplace()` | **G7107** B57 `ucfirst()` | **G7108** B58 `lcfirst()` |
| **G7109** B59 `ucwords()` | **G7112** B60 `strip_tags()` | **G7113** B61 `addslashes()` | **G7114** B62 `stripslashes()` |
| **G7115** B63 `str_rot13()` | **G7116** B64 `str_word_count()` | **G7117** B65 `str_split()` | **G7118** B66 `strcspn()` |
| **G7119** B67 `strspn()` | **G7124** B68 `ltrim(, lit)` | **G7125** B69 `rtrim(, lit)` | **G7126** B70 `trim(, lit)` |
| **G7127** B71 `wordwrap()` | **G7128** B72 `chunk_split()` | **G7129** B73 `strtr()` | **G7132** B74 `htmlentities()` |
| **G7133** B75 `html_entity_decode()` | **G7134** B76 `json_encode()` | **G7135** B77 `json_decode()` | **G7136** B78 `md5()` |
| **G7137** B79 `sha1()` | **G7138** B80 `base64_encode()` | **G7139** B81 `base64_decode()` | **G7143** B82 `bin2hex()` |
| **G7144** B83 `preg_quote()` | **G7145** B84 `parse_url()` | **G7146** B85 `basename()` | **G7147** B86 `dirname()` |
| **G7148** B87 `gettype()` | **G7149** B88 `is_callable()` | **G7152** B89 `is_resource()` | **G7153** B90 `ord()` |
| **G7154** B91 `chr()` | **G7155** B92 `preg_match()` | **G7156** B93 `hash()` | **G7157** B94 `sprintf()` |
| **G7158** B95 `number_format()` | **G7159** B96 `implode()` | **G7160** B97 `preg_replace()` | **G7161** B98 `preg_split()` |
| **G7162** B99 `hexdec()` | **G7163** B100 `dechex()` | **G7164** B101 `strval()` | **G7165** B102 `filter_var()` |
| **G7166** B103 `crc32()` | | | |

Also indexed: `isset`, `count`, `is_array`, `is_string`, `abs`, `is_numeric`, logical !, `is_int`, `is_bool`, `is_null`, unary -, `round()`, `floor()`, `ceil()`, `strtolower()`, `strtoupper()`, `htmlspecialchars()`, `nl2br()`, `urlencode()`, `rawurlencode()`, `urldecode()`, `rawurldecode()`, `ltrim()`, `rtrim()`, `is_float()`, `is_object()`, `is_scalar()`, `max()`, `min()`, `substr()`, `strpos()`, `stripos()`, `strrpos()`, `strripos()`, `str_contains()`, `str_starts_with()`, `str_ends_with()`, `substr_count()`, `explode()`, `strcmp()`, `strcasecmp()`, `strncmp()`, `strncasecmp()`, `strrev()`, `str_repeat()`, `str_pad()`, `str_replace()`, `str_ireplace()`, `ucfirst()`, `lcfirst()`, `ucwords()`, `strip_tags()`, `addslashes()`, `stripslashes()`, `str_rot13()`, `str_word_count()`, `str_split()`, `strcspn()`, `strspn()`, `ltrim(, lit)`, `rtrim(, lit)`, `trim(, lit)`, `wordwrap()`, `chunk_split()`, `strtr()`, `htmlentities()`, `html_entity_decode()`, `json_encode()`, `json_decode()`, `md5()`, `sha1()`, `base64_encode()`, `base64_decode()`, `bin2hex()`, `preg_quote()`, `parse_url()`, `basename()`, `dirname()`, `gettype()`, `is_callable()`, `is_resource()`, `ord()`, `chr()`, `preg_match()`, `hash()`, `sprintf()`, `number_format()`, `implode()`, `preg_replace()`, `preg_split()`, `hexdec()`, `dechex()`, `strval()`, `filter_var()`, `crc32()`.

---

## 1a. WISP showcase — default CI (Phase 45)

WISP Module_Manager CWL showcase runs in **default CI** (**D6336**, **G9170**). Extended operator path remains in `.github/workflows/wisp-poc-regression.yml`.

| When | Run |
| --- | --- |
| Default CI / build | `hub:phase45-wisp-showcase-smoke` (**G9170**) |
| Operator refresh / chimera deploy | `wisp:deploy:gce`, `wisp:operator-verify -- --require` |
| Full extended POC regression | `.github/workflows/wisp-poc-regression.yml` |
| Phase 14 closed verify | `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**) |
| Phase 13 verify | `hub:wisp-cwl-phase13-close-smoke` (**G6410**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) · [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md)

---

## 1b (archived). Optional — WISP POC regression (legacy operator path)

Pre-Phase-27 operator deploy and chimera showcase. **Not** the default build queue.

| When | Run |
| --- | --- |
| Operator refresh / chimera deploy | `wisp:deploy:gce`, `wisp:operator-verify -- --require` |
| Full POC regression (local or CI) | `.github/workflows/wisp-poc-regression.yml` |
| Phase 14 closed verify | `hub:wisp-cwl-phase14-program-close-smoke` (**G6690**) |
| Phase 13 verify | `hub:wisp-cwl-phase13-close-smoke` (**G6410**) |

Detail: [`WISP-CWL-FULLSTACK-PROGRAM.md`](./WISP-CWL-FULLSTACK-PROGRAM.md) (archived — [`archive/INDEX.md`](./archive/INDEX.md))

---

## 2. Maintenance (reactive)

| Trigger | Action | Pointer |
| --- | --- | --- |
| CI red / gate failure | Fix regression; run relevant smoke | `ROADMAP.md` |
| Parser gap / unsupported PHP | Hole + fixture; IR helper tier if chartered | `AGENTS.md` §4 |
| Customer oracle / session | Redaction lockstep; Redis session smoke | `AGENTS.md` oracle-php |
| Commercial license | `@chrysalis/license` build + sign playbook | `docs/COMMERCIAL.md` |

---

## 3. Honest gaps (paused — not default build)

| Gap | Status | Doc |
| --- | --- | --- |
| Extended matrix oracle promotion | **426/601** below target — Phase 45 wave maintenance (**G9160**); not production parity | [`PHASE-45-PROGRAM.md`](./PHASE-45-PROGRAM.md) |
| Live operator deploy refresh | Operator-run — `wisp:deploy:gce` + `wisp:operator-verify --require` | `WISP-PRODUCTION-COMPLETION-PROGRAM.md` |
| Real WordPress core install | Customer-owned oracle | `WORDPRESS-CUSTOMER-ORACLE.md` |
| Customer north-star metrics | Playbook scaffolding | `CUSTOMER-NORTH-STAR-METRICS.md` |
| Commercial launch | Optional vendor gate | `COMMERCIAL.md` |
| WPTP D2+ sibling repos | Out-of-repo matrix | `MULTI-REPO-WORKSPACE.md` |
| IR helper lifting backlog | Phase 45 first-class **G6731** / **G7200** | [`IR-HELPER-LIFTING.md`](./IR-HELPER-LIFTING.md) |

Governance hooks: `runMaintenanceProgramCompleteGate`, `runHonestGapsProgramCompleteGate`, `runHonestGapsImplementationCloseGate`.

---

## 4. Closed programs (reference only)

Full catalog: [`archive/INDEX.md`](./archive/INDEX.md).

| Program | Close | Smoke |
| --- | --- | --- |
| Migration OS composite | **G8550** | `hub:migration-os-close-smoke` |
| Intelligence Shorthand | **G8560** | `hub:intelligence-shorthand-close-smoke` |
| Open Legacy expansion | **G8520** / **G8570** | `hub:site-port-open-legacy-close-smoke` |
| VMF hub API | **G8540** | `hub:site-port-federation-hub-close-smoke` |
| Site → CWL → LLM | **G8400** / **G8410** | `hub:site-port-close-smoke` |
| WISP production completion | **G7990** | `hub:wisp-production-completion-close-smoke` |
| WISP full site CWL | **G7790** | `hub:wisp-full-site-close-smoke` |
| Complete language v1 | **G7150** | `hub:cwl-complete-language-close-smoke` |
| IR Helper Program v1 | **G7200** | `hub:ir-helper-program-close-smoke` |
| Full matrix oracle product | **G8790** / **G8700** (**D6301**) | `hub:full-matrix-oracle-close-smoke` |
| LLM-assisted convert | **G8830** / **G8800** | `hub:llm-assisted-convert-close-smoke` |
| LLM convert full | **G8940** / **G8900** | `hub:llm-convert-full-close-smoke` |
| Phase 44 extended matrix | **G9140** / **G9000** | `hub:phase44-program-close-smoke` |
