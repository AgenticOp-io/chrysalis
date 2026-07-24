"""Reference emit for CKPRUSRN — CALL/USING TAKE path → phase 20."""
# EXPECTED: 20
ENTRY = "T"
PHASE = {"I": 0, "T": 20, "C": 30, "R": 40}.get(ENTRY, 99)
print(f"{PHASE:02d}")
