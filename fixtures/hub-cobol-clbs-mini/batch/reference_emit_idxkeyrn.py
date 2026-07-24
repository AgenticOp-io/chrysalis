"""Reference emit for IDXKEYRN — LINE SEQUENTIAL key scan → 77.50."""
# EXPECTED: 77.50
ROWS = {10: 12.50, 42: 77.50, 99: 1.00}
FIND = 42
print(f"{ROWS[FIND]:.2f}")
