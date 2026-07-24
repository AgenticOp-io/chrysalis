// EXPECTED: 77.50
// Reference emit for IDXPROBE — GnuCOBOL INDEXED (BDB) ≠ mainframe VSAM.
using System;
using System.Collections.Generic;
public static class IdxprobeRef {
  public static void Main() {
    var rows = new Dictionary<int, double> { {10, 12.50}, {42, 77.50} };
    Console.WriteLine(rows[42].ToString("0.00"));
  }
}
