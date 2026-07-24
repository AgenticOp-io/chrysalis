// EXPECTED: 3
// Reference emit for PORTVALDN — PORTVALD COPY-linked validation RC sum.
public final class PortvaldnRef {
  static final int VAL_SUCCESS = 0;
  static final int VAL_INVALID_ID = 1;
  static final int VAL_INVALID_ACCT = 2;
  static final int VAL_INVALID_TYPE = 3;
  static final int VAL_INVALID_AMT = 4;

  static int validateId(String v) {
    if (!v.startsWith("PORT")) return VAL_INVALID_ID;
    try {
      Integer.parseInt(v.substring(4, 8));
    } catch (Exception e) {
      return VAL_INVALID_ID;
    }
    return VAL_SUCCESS;
  }

  static int validateAccount(String v) {
    try {
      if (Long.parseLong(v.trim()) == 0) return VAL_INVALID_ACCT;
    } catch (Exception e) {
      return VAL_INVALID_ACCT;
    }
    return VAL_SUCCESS;
  }

  static int validateType(String v) {
    String t = v.trim();
    if (!(t.equals("STK") || t.equals("BND") || t.equals("MMF") || t.equals("ETF")))
      return VAL_INVALID_TYPE;
    return VAL_SUCCESS;
  }

  static int validateAmount(String v) {
    try {
      double n = Double.parseDouble(v);
      if (n < -9999999999999.99 || n > 9999999999999.99) return VAL_INVALID_AMT;
    } catch (Exception e) {
      return VAL_INVALID_AMT;
    }
    return VAL_SUCCESS;
  }

  public static void main(String[] args) {
    int total =
        validateId("XXXX9999")
            + validateAccount("0000000000")
            + validateType("ETF")
            + validateAmount("100.00");
    System.out.println(total);
  }
}
