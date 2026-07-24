// EXPECTED: 77.50
// Reference emit for IDXDELRN — GnuCOBOL INDEXED DELETE remaining key.
using System;
using System.Collections.Generic;
public static class IdxdelrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> { {10, 12.50}, {42, 77.50} };
    rows.Remove(10);
    Console.WriteLine(rows[42].ToString("0.00"));
  }
}
