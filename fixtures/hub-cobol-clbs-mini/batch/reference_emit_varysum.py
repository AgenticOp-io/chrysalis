"""Reference emit for VARYSUM — PERFORM VARYING 1..10 sum → 55."""
# EXPECTED: 55
TOTAL = sum(range(1, 11))
print(TOTAL)
