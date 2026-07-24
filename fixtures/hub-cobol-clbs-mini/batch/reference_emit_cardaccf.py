"""Reference emit for CARDACCF — multi-account fee table → 100.00."""
# EXPECTED: 100.00
RATE_A = 0.0200
RATE_D = 0.0550
LATE_FEE = 25.00
ACCOUNTS = [
    ("A", 1000.00, 0),
    ("D", 1000.00, 45),
    ("C", 500.00, 0),
]
total = 0.0
for status, bal, days in ACCOUNTS:
    if status == "A":
        fee = round(bal * RATE_A + 1e-12, 2)
    elif status == "D":
        fee = round(bal * RATE_D + 1e-12, 2)
        if days > 30:
            fee = round(fee + LATE_FEE + 1e-12, 2)
    else:
        fee = 0.0
    total = round(total + fee + 1e-12, 2)
print(f"{total:.2f}")
