"""Reference emit for EVALMANY — multi-WHEN EVALUATE subject → 25."""
# EXPECTED: 25
CODE = 2
FEE = {1: 10, 2: 25, 3: 40}.get(CODE, 99)
print(FEE)
