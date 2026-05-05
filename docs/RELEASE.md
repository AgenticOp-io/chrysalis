# Release process (maintainers)

This repository ships as a **source tree** (pnpm monorepo). The v1 line is tagged in Git; release artifacts are **source tarballs** produced with `git archive` (no `npm publish` of individual packages in this flow).

## Version policy

- **Root** `package.json` `version` is the release identifier (e.g. `2.0.0`).
- Workspace packages use the same semver for clarity; consumers still resolve via `workspace:*`.

## Steps to cut a release

1. **Freeze main** — merge all intended work; CI green.  
2. **Update changelog** — edit root `CHANGELOG.md` with the new version section and date.  
3. **Bump versions** — root and `packages/*/package.json` `version` fields.  
4. **Commit** — e.g. `release: v2.0.0`.
5. **Tag** — annotated tag recommended:

   ```bash
   git tag -a v2.0.0 -m "Chrysalis v2.0.0"
   ```

6. **Artifacts** — from repo root, after commit:

   ```bash
   pnpm run release:artifacts
   ```

   This writes `release/chrysalis-<version>-source.tar.gz` and `.zip` (git-tracked files only; respect `.gitattributes` export-ignore if added later).

7. **Push** — branch and tags:

   ```bash
   git push origin main
   git push origin v2.0.0
   ```

8. **GitHub Release** — pushing a semver tag matching **`v*.*.*`** runs **`.github/workflows/release.yml`**, which builds the same archives and calls **`gh release create`** with **`GITHUB_TOKEN`**. If that job is disabled or fails, use the UI or CLI manually:

   *Releases* → *Draft a new release* → choose tag `v2.0.0` → attach the two files under `release/` → publish.

   ```bash
   gh release create v2.0.0 release/chrysalis-2.0.0-source.tar.gz release/chrysalis-2.0.0-source.zip --title "Chrysalis v2.0.0" --notes-file CHANGELOG.md
   ```

   Adjust filenames to match the version you built.

## Planning (GitHub Project)

To track post-v1 work in a **GitHub Project** linked to this repository, see [`GITHUB_PROJECT.md`](./GITHUB_PROJECT.md) and run `pnpm run github:project-bootstrap` after `gh auth refresh -s project,read:project`.

## Checklist (common gaps)

| Item | Status in repo |
| --- | --- |
| License file | `LICENSE` (MIT) |
| Changelog | `CHANGELOG.md` |
| Install / ops / admin docs | `docs/` |
| Security reporting | `SECURITY.md` |
| Version in `package.json` | Bumped per release |
| Tag matches changelog version | Manual verify |
| Tarballs excluded from git | `release/` in `.gitignore` |
| SBOM / npm publish | Not part of default v1 source release |
| Optional commercial CLI gate (**D289**) | **`docs/COMMERCIAL.md`** (playbook; **not a public product launch**); in-tree **`@chrysalis/license`**, **`chrysalis license`**, **`pnpm run license:sign`**. Source tarballs include these files; paid SKUs and keys stay **out of band**. |

## GitHub Actions release workflow (`.github/workflows/release.yml`)

Runs on every push of a semver tag `v*.*.*`. It builds `release/*.tar.gz` and `release/*.zip`, then either **creates** a GitHub Release or, if that tag’s release **already exists** (workflow retry, manual release first, or race), **uploads assets with `--clobber`**. That avoids the common failure:

```text
HTTP 422: Validation Failed (already_exists / release already exists)
```

The job sets **`GH_REPO`** so `gh` always targets this repository from the workspace checkout.

If the job still fails, check the log for **`command -v gh`** (CLI missing), **`gh release view`** / **`gh release upload`** errors, or org policies blocking **`GITHUB_TOKEN`** from creating releases.

## Verifying a tarball

```bash
tar -tzf release/chrysalis-2.0.0-source.tar.gz | head
mkdir /tmp/chrysalis-unpack && tar -xzf release/chrysalis-2.0.0-source.tar.gz -C /tmp/chrysalis-unpack
cd /tmp/chrysalis-unpack/chrysalis-2.0.0
pnpm install && pnpm -r build && pnpm test
```
