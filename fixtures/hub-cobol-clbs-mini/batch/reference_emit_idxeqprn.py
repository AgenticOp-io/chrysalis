"""Reference emit for IDXEQPRN — INDEXED START EQUAL + 2× READ PREV → 33.00."""
# EXPECTED: 33.00
ROWS = {10: 12.50, 20: 8.00, 42: 25.00, 55: 30.00, 99: 15.00}
START = 42
LIMIT = 2
# GnuCOBOL: after START EQUAL, READ PREVIOUS yields positioned key then prior.
keys = sorted((k for k in ROWS if int(k) <= START), reverse=True)[:LIMIT]
total = sum(ROWS[k] for k in keys)
print(f"{total:.2f}")
