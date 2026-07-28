"""Reference emit for CKPRSTDN — CKPRST COPY-linked status 88 RC sum → 150."""
# EXPECTED: 150
# Mirrors COPY CKPRST 88-levels: INITIAL/ACTIVE/COMPLETE/FAILED/RESTARTED.


def status_rc(status: str) -> int:
    if status == "I":
        return 10
    if status == "A":
        return 20
    if status == "C":
        return 30
    if status == "F":
        return 40
    if status == "R":
        return 50
    return 99


total = sum(status_rc(s) for s in ("I", "A", "C", "F", "R"))
print(total)
