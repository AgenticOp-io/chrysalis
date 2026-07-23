"""Reference emit for CLBSMATH — same inputs as fixtures/hub-cobol-clbs-mini/batch/CLBSMATH.cbl."""
AMOUNT = 1000.00
RATE = 0.0525
RESULT = round(AMOUNT * RATE + 1e-12, 2)
print(f"{RESULT:.2f}")
