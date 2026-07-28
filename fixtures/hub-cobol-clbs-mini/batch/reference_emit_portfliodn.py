"""Reference emit for PORTFLIODN — PORTFLIO COPY-linked type+status RC sum → 66."""
# EXPECTED: 66


def type_rc(client_type: str) -> int:
    if client_type == "I":
        return 10
    if client_type == "C":
        return 20
    if client_type == "T":
        return 30
    return 99


def status_rc(status: str) -> int:
    if status == "A":
        return 1
    if status == "C":
        return 2
    if status == "S":
        return 3
    return 99


total = sum(type_rc(t) for t in ("I", "C", "T")) + sum(
    status_rc(s) for s in ("A", "C", "S")
)
print(total)
