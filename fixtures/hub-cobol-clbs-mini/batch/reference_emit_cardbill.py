"""Reference emit for CARDBILL — fee + late IF + interest → 69.44."""
# EXPECTED: 69.44
BAL = 1000.00
FEE_RATE = 0.0290
INT_RATE = 0.0150
DAYS_LATE = 45
LATE_FEE = 25.00
FEE = round(BAL * FEE_RATE + 1e-12, 2)
LATE = LATE_FEE if DAYS_LATE > 30 else 0.0
INTEREST = round((BAL + FEE) * INT_RATE + 1e-12, 2)
TOTAL = round(FEE + LATE + INTEREST + 1e-12, 2)
print(f"{TOTAL:.2f}")
