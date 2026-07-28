"""Reference emit for CKPRSTPH — CKPRST COPY-linked phase 88 RC sum → 100."""
# EXPECTED: 100


def phase_rc(phase: str) -> int:
    if phase == "00":
        return 0
    if phase == "10":
        return 10
    if phase == "20":
        return 20
    if phase == "30":
        return 30
    if phase == "40":
        return 40
    return 99


print(sum(phase_rc(p) for p in ("00", "10", "20", "30", "40")))
