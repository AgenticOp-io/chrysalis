"""Reference emit for TSTVALRN — TSTVAL00 FUNC-PERF USING path → 31."""
# EXPECTED: 31
FUNC = "PERF"
RC = {"INIT": 0, "FUNC": 11, "INTG": 21, "PERF": 31, "ERR": 41}.get(FUNC, 99)
print(f"{RC:02d}")
