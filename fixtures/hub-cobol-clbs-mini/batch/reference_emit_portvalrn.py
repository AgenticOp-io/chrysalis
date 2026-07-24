"""Reference emit for PORTVALRN — PORTVALD FUNC-VTYP USING path → 31."""
# EXPECTED: 31
FUNC = "VTYP"
RC = {"INIT": 0, "VID": 11, "VACT": 21, "VTYP": 31, "VAMT": 41}.get(FUNC, 99)
print(f"{RC:02d}")
