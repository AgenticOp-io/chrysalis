// EXPECTED: 82.50
// Reference emit for IDXSTRWR — GnuCOBOL INDEXED START + REWRITE.
using System;
using System.Collections.Generic;
public static class IdxstrwrRef {
  public static void Main() {
    var rows = new Dictionary<int, double> { {10, 12.50}, {42, 77.50} };
    Console.WriteLine((rows[42] + 5.00).ToString("0.00"));
  }
}
