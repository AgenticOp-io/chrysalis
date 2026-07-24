"""Reference emit for IDXDELRN — GnuCOBOL INDEXED DELETE → 77.50."""
# EXPECTED: 77.50
ROWS = {10: 12.50, 42: 77.50}
DEL = 10
FIND = 42
del ROWS[DEL]
print(f"{ROWS[FIND]:.2f}")
