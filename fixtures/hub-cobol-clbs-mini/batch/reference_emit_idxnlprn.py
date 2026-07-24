"""Reference emit for IDXNLPRN — INDEXED START NOT LESS + READ PREV → 45.50."""
# EXPECTED: 45.50
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 42
# GnuCOBOL: after START NOT LESS, READ PREVIOUS includes the positioned key.
total = sum(v for k, v in ROWS.items() if int(k) <= START)
print(f"{total:.2f}")
