"""Reference emit for IDXNGTRN — INDEXED START NOT GREATER + READ NEXT → 70.00."""
# EXPECTED: 70.00
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 42
# GnuCOBOL BDB: START NOT GREATER positions at greatest key <= START, then NEXT forward.
total = sum(v for k, v in ROWS.items() if int(k) >= START)
print(f"{total:.2f}")
