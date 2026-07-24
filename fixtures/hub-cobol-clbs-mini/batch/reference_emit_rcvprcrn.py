"""Reference emit for RCVPRCRN — RCVPRC00 FUNC-RECV USING path → 12."""
# EXPECTED: 12
FUNC = "RECV"
RC = {"INIT": 0, "RECV": 12, "TERM": 22}.get(FUNC, 99)
print(f"{RC:02d}")
