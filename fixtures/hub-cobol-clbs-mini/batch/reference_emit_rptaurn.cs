// EXPECTED: 85.75
// Reference emit for RPTAUDRN — CLBS audit-report sequential severity sum.
using System;
public static class RptaurnRef {
  public static void Main() {
    double[] audit = {20.00, 35.50, 15.25};
    double[] errors = {10.00, 5.00};
    double total = 0.0;
    foreach (var v in audit) total += v;
    foreach (var v in errors) total += v;
    Console.WriteLine(total.ToString("0.00"));
  }
}
