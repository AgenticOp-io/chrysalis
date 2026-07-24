"""Reference emit for PORTMSTRN — PORTMSTR C/R/U/D USING path → 108."""
# EXPECTED: 108
CMDS = ["C", "R", "U", "D"]
CODES = {"C": 12, "R": 22, "U": 32, "D": 42}
total = sum(CODES[c] for c in CMDS)
print(f"{total:03d}")
