// EXPECTED: 405.75
// Reference emit for RPTPOSRN — CLBS position-report sequential sum.
using System;
public static class RptposrnRef {
  public static void Main() {
    double[] values = {125.00, 200.50, 80.25};
    double total = 0.0;
    foreach (var v in values) total += v;
    Console.WriteLine(total.ToString("0.00"));
  }
}
