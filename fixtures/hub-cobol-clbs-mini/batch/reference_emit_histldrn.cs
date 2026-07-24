// EXPECTED: 45.75
// Reference emit for HISTLDRN — CLBS history-load sequential sum.
using System;
public static class HistldrnRef {
  public static void Main() {
    double[] amounts = {12.50, 25.00, 8.25};
    double total = 0.0;
    foreach (var a in amounts) total += a;
    Console.WriteLine(total.ToString("0.00"));
  }
}
