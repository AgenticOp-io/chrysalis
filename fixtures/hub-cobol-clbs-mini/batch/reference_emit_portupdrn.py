"""Reference emit for PORTUPDRN — PORTUPDT EVALUATE TRUE S+V+N → 63."""
# EXPECTED: 63
ACTIONS = ["S", "V", "N"]
CODES = {"S": 11, "V": 21, "N": 31}
total = sum(CODES[a] for a in ACTIONS)
print(f"{total:02d}")
