// EXPECTED: 23.75
// Reference emit for RTNANARN — CLBS return-code analysis sequential weight sum.
using System;
public static class RtnanarnRef {
  public static void Main() {
    double[] weights = {1.25, 1.25, 1.25, 2.50, 2.50, 5.00, 10.00};
    double total = 0.0;
    foreach (var v in weights) total += v;
    Console.WriteLine(total.ToString("0.00"));
  }
}
