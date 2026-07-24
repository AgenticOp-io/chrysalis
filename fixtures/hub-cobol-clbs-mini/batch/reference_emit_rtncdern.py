"""Reference emit for RTNCDERN — RTNCDE00 FUNC-SETC USING path → 06."""
# EXPECTED: 06
FUNC = "SETC"
RC = {"INIT": 0, "SETC": 6, "GETC": 16, "ANLZ": 26}.get(FUNC, 99)
print(f"{RC:02d}")
