// EXPECTED: 78.25
// Reference emit for POSUPDRN — CLBS POSUPDT-shaped position update sum.
using System;
public static class PosupdrnRef {
  public static void Main() {
    double[] amounts = {30.00, 25.50, 22.75};
    double total = 0;
    foreach (var a in amounts) total += a;
    Console.WriteLine(total.ToString("0.00"));
  }
}
