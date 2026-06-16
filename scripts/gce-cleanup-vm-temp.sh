#!/usr/bin/env bash
# Remove leaked smoke temp dirs and stale refresh tarballs on the GCE VM.
set -euo pipefail

log() { echo "[gce-cleanup-vm-temp] $(date -Is) $*"; }

freed=0
for base in /tmp /var/tmp "${TMPDIR:-}"; do
  [[ -n "${base}" && -d "${base}" ]] || continue
  while IFS= read -r -d '' dir; do
    size="$(du -sk "${dir}" 2>/dev/null | awk '{print $1}')"
    rm -rf "${dir}"
    freed=$((freed + size))
    log "removed ${dir} (${size}K)"
  done < <(find "${base}" -maxdepth 1 -type d -name 'chrysalis-*' -print0 2>/dev/null)
done

for tarball in "${HOME}/chrysalis-src.tgz" "${HOME}/chrysalis-src-"*.tar.gz; do
  [[ -e "${tarball}" ]] || continue
  size="$(du -sk "${tarball}" 2>/dev/null | awk '{print $1}')"
  rm -f "${tarball}"
  freed=$((freed + size))
  log "removed ${tarball} (${size}K)"
done

log "done approx_freed_k=${freed}"
