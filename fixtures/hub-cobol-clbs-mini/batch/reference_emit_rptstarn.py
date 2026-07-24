"""Reference emit for RPTSTARN — CLBS RPTSTA00-shaped DB2+batch metrics sum → 71.75."""
# EXPECTED: 71.75
DB2 = [12.50, 18.75, 9.00]
BATCH = [20.00, 11.50]
print(f"{sum(DB2) + sum(BATCH):.2f}")
