// EXPECTED: 77.50
// Reference emit for IDXKEYRN — sequential key scan (VSAM substitute).
using System;
using System.Collections.Generic;
public static class IdxkeyrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> { {10, 12.50}, {42, 77.50}, {99, 1.00} };
    Console.WriteLine(rows[42].ToString("F2"));
  }
}
