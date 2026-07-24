"""Reference emit for CARDINTRN — CardDemo fee idiom 1000 * 0.029 → 29.00."""
# EXPECTED: 29.00
BAL = 1000.00
RATE = 0.0290
FEE = round(BAL * RATE + 1e-12, 2)
print(f"{FEE:.2f}")
