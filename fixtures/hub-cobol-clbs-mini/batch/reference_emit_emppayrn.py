"""Reference emit for EMPPAYRN — 19h * 23.50, OT 0 → 446.50."""
# EXPECTED: 446.50
HOURS = 19
RATE = 23.50
OT = 0.0 if HOURS < 40 else 0.25
WEEK = HOURS * RATE * (1 + OT)
print(f"{WEEK:.2f}")
