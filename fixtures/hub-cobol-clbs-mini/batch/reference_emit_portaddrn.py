"""Reference emit for PORTADDRN — PORTADD LINE SEQ validate+add count → 3."""
# EXPECTED: 3
ROWS = [
    ("PORT0001", "A"),
    ("PORT0002", "A"),
    ("", "A"),
    ("PORT0003", "A"),
]
count = sum(1 for pid, st in ROWS if pid.strip() and st == "A")
print(count)
