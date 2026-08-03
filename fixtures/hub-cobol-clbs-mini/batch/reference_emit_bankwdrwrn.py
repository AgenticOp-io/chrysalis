"""Reference emit for BANKWDRWRN — rocket-bank withdrawal remaining."""
# EXPECTED: 155.00
BAL = 200.00
WDRW = 45.00
REMAIN = round(BAL - WDRW + 1e-12, 2) if WDRW <= BAL else BAL
print(f"{REMAIN:.2f}")
