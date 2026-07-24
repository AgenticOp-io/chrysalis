"""Reference emit for ENTRYRN — quoted ENTRY 'ALTPHASE' → phase 55."""
# EXPECTED: 55
ENTRY = "ALTPHASE"
PHASE = 55 if ENTRY == "ALTPHASE" else 10
print(f"{PHASE:02d}")
