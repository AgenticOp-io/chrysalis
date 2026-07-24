// EXPECTED: 71.75
// Reference emit for RPTSTARN — CLBS stats-report sequential metrics sum.
using System;
public static class RptstarnRef {
  public static void Main() {
    double[] db2 = {12.50, 18.75, 9.00};
    double[] batch = {20.00, 11.50};
    double total = 0.0;
    foreach (var v in db2) total += v;
    foreach (var v in batch) total += v;
    Console.WriteLine(total.ToString("0.00"));
  }
}
