"""Reference emit for UTLMNTLS — UTLMNT00 LINE SEQ control ARCHIVE+CLEANUP+REORG → 72."""
# EXPECTED: 72
FUNCS = ["ARCHIVE", "CLEANUP", "REORG"]
CODES = {"ARCHIVE": 14, "CLEANUP": 24, "REORG": 34, "ANALYZE": 44}
total = sum(CODES[f] for f in FUNCS)
print(f"{total:02d}")
