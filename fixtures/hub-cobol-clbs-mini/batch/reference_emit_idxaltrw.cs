// EXPECTED: 92.25
// Reference emit for IDXALTRW — GnuCOBOL INDEXED alt-key START+REWRITE.
using System;
using System.Collections.Generic;
public static class IdxaltrwRef {
  public static void Main() {
    var rows = new Dictionary<string, double> {
      {"ALT00010", 12.50}, {"ALT00088", 88.25}
    };
    Console.WriteLine((rows["ALT00088"] + 4.00).ToString("0.00"));
  }
}
