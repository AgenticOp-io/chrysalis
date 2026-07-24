"""Reference emit for PORTDELRN — PORTDEL reason EVALUATE TRUE → 60."""
# EXPECTED: 60
REASONS = ["01", "02", "03"]
CODES = {"01": 10, "02": 20, "03": 30}
total = sum(CODES[r] for r in REASONS)
print(f"{total:02d}")
