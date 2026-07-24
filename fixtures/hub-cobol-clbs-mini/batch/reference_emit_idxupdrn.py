"""Reference emit for IDXUPDRN — key scan + ADD update → 82.50."""
# EXPECTED: 82.50
ROWS = {10: 12.50, 42: 77.50, 99: 1.00}
FIND = 42
DELTA = 5.00
print(f"{ROWS[FIND] + DELTA:.2f}")
