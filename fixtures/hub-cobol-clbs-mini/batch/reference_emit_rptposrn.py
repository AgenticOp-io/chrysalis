"""Reference emit for RPTPOSRN — CLBS RPTPOS00-shaped position report sum → 405.75."""
# EXPECTED: 405.75
VALUES = [125.00, 200.50, 80.25]
print(f"{sum(VALUES):.2f}")
