// EXPECTED: 3
// Reference emit for PORTVALDN — PORTVALD COPY-linked validation RC sum.
using System;
public static class PortvaldnRef {
  const int ValSuccess = 0;
  const int ValInvalidId = 1;
  const int ValInvalidAcct = 2;
  const int ValInvalidType = 3;
  const int ValInvalidAmt = 4;

  static int ValidateId(string v) {
    if (!v.StartsWith("PORT")) return ValInvalidId;
    if (!int.TryParse(v.Substring(4, 4), out _)) return ValInvalidId;
    return ValSuccess;
  }

  static int ValidateAccount(string v) {
    if (!long.TryParse(v.Trim(), out var n) || n == 0) return ValInvalidAcct;
    return ValSuccess;
  }

  static int ValidateType(string v) {
    var t = v.Trim();
    if (t != "STK" && t != "BND" && t != "MMF" && t != "ETF") return ValInvalidType;
    return ValSuccess;
  }

  static int ValidateAmount(string v) {
    if (!double.TryParse(v, out var n)) return ValInvalidAmt;
    if (n < -9999999999999.99 || n > 9999999999999.99) return ValInvalidAmt;
    return ValSuccess;
  }

  public static void Main() {
    int total =
        ValidateId("XXXX9999")
        + ValidateAccount("0000000000")
        + ValidateType("ETF")
        + ValidateAmount("100.00");
    Console.WriteLine(total);
  }
}
