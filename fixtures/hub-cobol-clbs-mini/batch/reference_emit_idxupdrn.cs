// EXPECTED: 82.50
// Reference emit for IDXUPDRN — sequential key update (VSAM REWRITE substitute).
using System;
using System.Collections.Generic;
public static class IdxupdrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> { {10, 12.50}, {42, 77.50}, {99, 1.00} };
    double delta = 5.00;
    Console.WriteLine((rows[42] + delta).ToString("F2"));
  }
}
