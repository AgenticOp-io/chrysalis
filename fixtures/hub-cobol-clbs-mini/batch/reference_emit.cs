// EXPECTED: 52.50
// Reference emit contract for CLBSMATH (1000.00 * 0.0525 rounded).
using System;
public static class ClbsMathRef {
  public static void Main() {
    double amount = 1000.00;
    double rate = 0.0525;
    double result = Math.Round(amount * rate, 2, MidpointRounding.AwayFromZero);
    Console.WriteLine(result.ToString("0.00"));
  }
}
