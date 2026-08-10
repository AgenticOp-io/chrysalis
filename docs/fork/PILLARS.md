# Chrysalis pillars (Convert view)

AgenticOps runs **three interactive components**:

1. **CWL** — language (mature independently; do not treat every convert spike as a language change)  
2. **Convert** — this engine (Universal Translator)  
3. **Secure** — Helix (`chrysalis-security`) — traffic DNA firewall  

Convert **produces/consumes CWL**. Secure bridges CWL surface ↔ traffic DNA per **RFC-0022** (contract in `chrysalis-cwl`; Helix implements). Convert must not absorb Helix or invent DNA semantics.

**Operator rule:** before Convert deepen, check CWL core (`LANGUAGE_VERSION.md` + `hub:cwl-language-pillar-smoke` / CWL-Above-Code). Do not treat every Convert spike as a CWL language change.

Portfolio doc: `AgenticOps/docs/THREE_PILLARS.md`.
