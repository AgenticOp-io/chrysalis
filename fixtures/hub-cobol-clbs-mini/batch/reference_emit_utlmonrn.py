"""Reference emit for UTLMONRN — UTLMON00 FUNC-THRS USING path → 26."""
# EXPECTED: 26
FUNC = "THRS"
RC = {"INIT": 0, "COLL": 16, "THRS": 26, "ALOG": 36, "ALRT": 46}.get(FUNC, 99)
print(f"{RC:02d}")
