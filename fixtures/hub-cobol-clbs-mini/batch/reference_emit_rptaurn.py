"""Reference emit for RPTAUDRN — CLBS RPTAUD00-shaped audit+error severity sum → 85.75."""
# EXPECTED: 85.75
AUDIT = [20.00, 35.50, 15.25]
ERRORS = [10.00, 5.00]
print(f"{sum(AUDIT) + sum(ERRORS):.2f}")
