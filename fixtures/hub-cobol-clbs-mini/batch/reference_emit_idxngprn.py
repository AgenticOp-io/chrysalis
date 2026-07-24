"""Reference emit for IDXNGPRN — INDEXED START NOT GREATER + READ PREV → 75.50."""
# EXPECTED: 75.50
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 55
# GnuCOBOL BDB: START NOT GREATER positions at greatest key <= START; PREV includes it.
total = sum(v for k, v in ROWS.items() if int(k) <= START)
print(f"{total:.2f}")
