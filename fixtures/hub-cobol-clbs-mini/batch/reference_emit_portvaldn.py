"""Reference emit for PORTVALDN — PORTVALD COPY-linked validation RC sum → 3."""
# EXPECTED: 3
# Mirrors COPY PORTVAL return codes: INVALID-ID=1, INVALID-ACCT=2, SUCCESS=0.
VAL_SUCCESS = 0
VAL_INVALID_ID = 1
VAL_INVALID_ACCT = 2
VAL_INVALID_TYPE = 3
VAL_INVALID_AMT = 4
VAL_ID_PREFIX = "PORT"


def validate_id(value: str) -> int:
    if value[:4] != VAL_ID_PREFIX:
        return VAL_INVALID_ID
    if not value[4:8].isdigit():
        return VAL_INVALID_ID
    return VAL_SUCCESS


def validate_account(value: str) -> int:
    if not value.strip().isdigit() or int(value) == 0:
        return VAL_INVALID_ACCT
    return VAL_SUCCESS


def validate_type(value: str) -> int:
    if value.strip() not in ("STK", "BND", "MMF", "ETF"):
        return VAL_INVALID_TYPE
    return VAL_SUCCESS


def validate_amount(value: str) -> int:
    try:
        num = float(value)
    except ValueError:
        return VAL_INVALID_AMT
    if num < -9999999999999.99 or num > 9999999999999.99:
        return VAL_INVALID_AMT
    return VAL_SUCCESS


total = (
    validate_id("XXXX9999")
    + validate_account("0000000000")
    + validate_type("ETF")
    + validate_amount("100.00")
)
print(total)
