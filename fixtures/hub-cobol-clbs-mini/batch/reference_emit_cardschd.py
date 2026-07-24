"""Reference emit for CARDSCHD — multi-tran fee schedule SEARCH → 39.00."""
# EXPECTED: 39.00
SCHEDULE = {"P": 0.0200, "C": 0.0350, "F": 0.0500}
TXNS = [("P", 800.00), ("C", 400.00), ("P", 200.00), ("F", 100.00)]
total = 0.0
for code, amt in TXNS:
    rate = SCHEDULE.get(code, 0.0)
    fee = round(amt * rate + 1e-12, 2)
    total = round(total + fee + 1e-12, 2)
print(f"{total:.2f}")
