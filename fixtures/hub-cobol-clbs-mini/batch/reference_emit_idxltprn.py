"""Reference emit for IDXLTPRN — INDEXED START LESS THAN + READ PREV → 20.50."""
# EXPECTED: 20.50
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 42
# GnuCOBOL: after START LESS THAN, READ PREVIOUS includes greatest key < start.
total = sum(v for k, v in ROWS.items() if int(k) < START)
print(f"{total:.2f}")
