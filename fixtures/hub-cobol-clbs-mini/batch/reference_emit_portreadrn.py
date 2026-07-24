"""Reference emit for PORTREADRN — PORTREAD LINE SEQ record count → 4."""
# EXPECTED: 4
ROWS = [
    ("PORT0001", "A"),
    ("PORT0002", "A"),
    ("PORT0003", "S"),
    ("PORT0004", "A"),
]
print(len(ROWS))
