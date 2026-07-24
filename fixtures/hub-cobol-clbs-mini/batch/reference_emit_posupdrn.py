"""Reference emit for POSUPDRN — CLBS POSUPDT-shaped position update sum → 78.25."""
# EXPECTED: 78.25
AMOUNTS = [30.00, 25.50, 22.75]
print(f"{sum(AMOUNTS):.2f}")
