"""Reference emit for CBACT04RN — CardDemo monthly interest (bal*rate)/1200."""
# EXPECTED: 1.25
BAL = 1000.00
RATE = 1.5
MONTHLY = round((BAL * RATE) / 1200 + 1e-12, 2)
print(f"{MONTHLY:.2f}")
