// EXPECTED: 2.50
// Reference emit for CARDTRANRN — type 01 fee 100 * 0.025.
using System;
public static class CardTranrnRef {
  public static void Main() {
    string type = "01";
    double amt = 100.00;
    double rate = 0.0250;
    double fee;
    if (type == "01") {
      fee = Math.Round(amt * rate, 2);
    } else if (type == "02") {
      fee = Math.Round(amt * rate * 0.5, 2);
    } else {
      fee = 0.0;
    }
    Console.WriteLine(fee.ToString("0.00"));
  }
}
