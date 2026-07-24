"""Reference emit for UTLVALRN — UTLVAL00 FUNC-BAL USING path → 38."""
# EXPECTED: 38
FUNC = "BAL"
RC = {"INIT": 0, "INTG": 8, "XREF": 18, "FMT": 28, "BAL": 38}.get(FUNC, 99)
print(f"{RC:02d}")
