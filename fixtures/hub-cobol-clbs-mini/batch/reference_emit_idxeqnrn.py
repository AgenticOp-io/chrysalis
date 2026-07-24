"""Reference emit for IDXEQNRN — INDEXED START EQUAL + READ NEXT ×3 → 63.00."""
# EXPECTED: 63.00
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 20
LIMIT = 3
# GnuCOBOL BDB: START EQUAL positions at key, then NEXT returns that record first.
ordered = sorted(ROWS.items())
idx = next(i for i, (k, _) in enumerate(ordered) if k == START)
total = sum(v for _, v in ordered[idx : idx + LIMIT])
print(f"{total:.2f}")
