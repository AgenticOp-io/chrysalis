// EXPECTED: 29.00
// Reference emit contract for CARDINTRN (1000.00 * 0.0290 rounded).
using System;
public static class CardIntrnRef {
  public static void Main() {
    double bal = 1000.00;
    double rate = 0.0290;
    double fee = Math.Round(bal * rate, 2);
    Console.WriteLine(fee.ToString("0.00"));
  }
}
