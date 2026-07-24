"""Reference emit for BCHCTLRN — BCHCTL00 FUNC-CHEK USING path → 15."""
# EXPECTED: 15
FUNC = "CHEK"
RC = {"INIT": 0, "CHEK": 15, "UPDT": 25, "TERM": 35}.get(FUNC, 99)
print(f"{RC:02d}")
