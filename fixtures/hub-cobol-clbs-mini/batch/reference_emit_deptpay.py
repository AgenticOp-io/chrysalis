"""Reference emit for DEPTPAY — 111111.11 / 19 → 5847.95 (truncate to 2dp)."""
# EXPECTED: 5847.95
TOTAL = 111111.11
N = 19
AVG = int(TOTAL / N * 100) / 100.0
print(f"{AVG:.2f}")
