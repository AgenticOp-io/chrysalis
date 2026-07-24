"""Reference emit for CARDFEEIN — CardDemo fee→interest chain → 44.44."""
# EXPECTED: 44.44
BAL = 1000.00
FEE_RATE = 0.0290
INT_RATE = 0.0150
FEE = round(BAL * FEE_RATE + 1e-12, 2)
INTEREST = round((BAL + FEE) * INT_RATE + 1e-12, 2)
TOTAL = round(FEE + INTEREST + 1e-12, 2)
print(f"{TOTAL:.2f}")
