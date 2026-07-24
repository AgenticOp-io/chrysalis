"""Reference emit for SEQMAX — LINE SEQUENTIAL max of written amounts."""
# EXPECTED: 30.00
AMOUNTS = [10.50, 20.25, 5.00, 30.00]
RESULT = max(AMOUNTS)
print(f"{RESULT:.2f}")
