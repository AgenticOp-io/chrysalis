"""Reference emit for SRCHTAB — OCCURS table + SEARCH keyed lookup → 350."""
# EXPECTED: 350
TABLE = {10: 100, 20: 200, 30: 350, 40: 400}
FIND = 30
RESULT = TABLE.get(FIND, 0)
print(RESULT)
