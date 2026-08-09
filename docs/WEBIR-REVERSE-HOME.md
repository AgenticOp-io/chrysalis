# WebIR reverse-home (Convert)

**SoR:** `chrysalis-cwl/packages/webir`  
**Convert:** junction / `file:../chrysalis-cwl/packages/webir` only — no second tree  
**Ask:** CWL [`docs/history/WEBIR-FLIP-REQUESTED.md`](../../chrysalis-cwl/docs/history/WEBIR-FLIP-REQUESTED.md)

## Setup

```powershell
pnpm run link:webir-from-cwl
# also runs from pretest
```

Creates `packages/webir` → `../chrysalis-cwl/packages/webir` (Windows junction / Unix symlink).  
Path is gitignored.

Root pin: `"@chrysalis/webir": "file:../chrysalis-cwl/packages/webir"`.  
Workspace packages may still declare `workspace:*` when the junction is present under `packages/*`.

## Prove

```powershell
pnpm run hub:webir-resolve-smoke
pnpm run hub:cwl-language-pillar-smoke
```

## Do not

- Edit WebIR under Convert (edit CWL copy)
- Invent a second `@chrysalis/webir`
- Commit `packages/webir/` contents
