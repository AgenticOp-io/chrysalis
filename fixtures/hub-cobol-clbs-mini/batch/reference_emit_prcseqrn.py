"""Reference emit for PRCSEQRN — PRCSEQ00 FUNC-NEXT USING path → 10."""
# EXPECTED: 10
FUNC = "NEXT"
RC = {"INIT": 0, "NEXT": 10, "STAT": 20, "TERM": 30}.get(FUNC, 99)
print(f"{RC:02d}")
