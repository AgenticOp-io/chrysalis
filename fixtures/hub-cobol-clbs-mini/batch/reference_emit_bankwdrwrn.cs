// EXPECTED: 155.00
// Reference emit for BANKWDRWRN — 200 - 45 remaining.
using System;
public static class BankWdrwrnRef {
  public static void Main() {
    double bal = 200.00;
    double wdrw = 45.00;
    double remain = wdrw <= bal ? Math.Round(bal - wdrw, 2) : bal;
    Console.WriteLine(remain.ToString("0.00"));
  }
}
