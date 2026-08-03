// EXPECTED: 1.25
// Reference emit for CBACT04RN — (1000.00 * 1.5) / 1200 rounded.
using System;
public static class Cbact04rnRef {
  public static void Main() {
    double bal = 1000.00;
    double rate = 1.5;
    double monthly = Math.Round((bal * rate) / 1200.0, 2);
    Console.WriteLine(monthly.ToString("0.00"));
  }
}
