"""Reference emit for NESTBR — nested IF grade bands, score 75 → 2."""
# EXPECTED: 2
SCORE = 75
if SCORE >= 90:
    GRADE = 4
elif SCORE >= 80:
    GRADE = 3
elif SCORE >= 70:
    GRADE = 2
else:
    GRADE = 1
print(GRADE)
