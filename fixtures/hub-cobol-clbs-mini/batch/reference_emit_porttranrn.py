"""Reference emit for PORTTRANRN — PORTTRAN type EVALUATE BU/SL/TR/FE → 104."""
# EXPECTED: 104
TYPES = ["BU", "SL", "TR", "FE"]
CODES = {"BU": 11, "SL": 21, "TR": 31, "FE": 41}
total = sum(CODES[t] for t in TYPES)
print(total)
