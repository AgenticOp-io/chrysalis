"""Reference emit for IDXLTNRN — INDEXED START LESS + READ NEXT → 90.50."""
# EXPECTED: 90.50
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 20
# GnuCOBOL BDB: START LESS positions at greatest key < START; NEXT includes it.
pos = max((int(k) for k in ROWS if int(k) < START), default=None)
total = sum(v for k, v in ROWS.items() if pos is not None and int(k) >= pos)
print(f"{total:.2f}")
