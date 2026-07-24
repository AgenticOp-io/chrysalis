"""Reference emit for RTNANARN — CLBS RTNANA00-shaped status-weight sum → 23.75."""
# EXPECTED: 23.75
WEIGHTS = [1.25, 1.25, 1.25, 2.50, 2.50, 5.00, 10.00]
print(f"{sum(WEIGHTS):.2f}")
