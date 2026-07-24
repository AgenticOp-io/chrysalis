"""Reference emit for PORTCOMRN — PORTCOM COPY CRUD EVALUATE → 120."""
# EXPECTED: 120
CMDS = ["CREA", "READ", "UPDT", "DELE"]
CODES = {"CREA": 15, "READ": 25, "UPDT": 35, "DELE": 45}
total = sum(CODES[c] for c in CMDS)
print(f"{total:03d}")
