"""Reference emit for CARDPAY — EVALUATE F/P/M + late IF → 125.00."""
# EXPECTED: 125.00
OPTION = "P"
BAL = 1000.00
PCT = 0.1000
MIN_PAY = 50.00
DAYS_LATE = 45
LATE_FEE = 25.00
if OPTION == "F":
    pay = BAL
elif OPTION == "P":
    pay = round(BAL * PCT + 1e-12, 2)
elif OPTION == "M":
    pay = MIN_PAY
else:
    pay = 0.0
total = round(pay + LATE_FEE + 1e-12, 2) if DAYS_LATE > 30 else pay
print(f"{total:.2f}")
