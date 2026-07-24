"""Reference emit for IDXPROBE — GnuCOBOL INDEXED key read → 77.50 (≠ VSAM)."""
# EXPECTED: 77.50
ROWS = {10: 12.50, 42: 77.50}
FIND = 42
print(f"{ROWS[FIND]:.2f}")
