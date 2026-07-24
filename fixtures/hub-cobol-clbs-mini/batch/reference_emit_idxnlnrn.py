"""Reference emit for IDXNLNRN — INDEXED START NOT LESS + READ NEXT → 78.00."""
# EXPECTED: 78.00
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 20
# GnuCOBOL BDB: START NOT LESS positions at first key >= START; NEXT includes it.
total = sum(v for k, v in ROWS.items() if int(k) >= START)
print(f"{total:.2f}")
