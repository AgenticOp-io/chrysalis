"""Reference emit for UTLMNTRN — UTLMNT00 FUNC-ARCH USING path → 14."""
# EXPECTED: 14
FUNC = "ARCH"
RC = {"INIT": 0, "ARCH": 14, "CLEN": 24, "REOR": 34, "ANYS": 44}.get(FUNC, 99)
print(f"{RC:02d}")
