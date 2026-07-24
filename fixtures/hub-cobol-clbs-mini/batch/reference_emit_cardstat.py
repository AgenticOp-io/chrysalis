"""Reference emit for CARDSTAT — multi-status × multi-rate → 80.00."""
# EXPECTED: 80.00
STATUS = "D"
BAL = 1000.00
RATE_A = 0.0200
RATE_D = 0.0550
RATE_C = 0.0000
DAYS_LATE = 45
LATE_FEE = 25.00
if STATUS == "A":
    fee = round(BAL * RATE_A + 1e-12, 2)
elif STATUS == "D":
    fee = round(BAL * RATE_D + 1e-12, 2)
elif STATUS == "C":
    fee = 0.0
else:
    fee = 0.0
total = round(fee + LATE_FEE + 1e-12, 2) if STATUS == "D" and DAYS_LATE > 30 else fee
print(f"{total:.2f}")
