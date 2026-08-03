"""Reference emit for CARDTRANRN — CardDemo type-01 purchase fee."""
# EXPECTED: 2.50
TRN_TYPE = "01"
AMT = 100.00
RATE = 0.0250
if TRN_TYPE == "01":
    FEE = round(AMT * RATE + 1e-12, 2)
elif TRN_TYPE == "02":
    FEE = round(AMT * RATE * 0.5 + 1e-12, 2)
else:
    FEE = 0.0
print(f"{FEE:.2f}")
