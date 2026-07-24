// EXPECTED: 88.25
// Reference emit for IDXALTRN — GnuCOBOL INDEXED ALTERNATE KEY read.
using System;
using System.Collections.Generic;
public static class IdxaltrnRef {
  public static void Main() {
    var rows = new Dictionary<string, double> {
      ["ALT00010"] = 12.50, ["ALT00088"] = 88.25,
    };
    Console.WriteLine(rows["ALT00088"].ToString("0.00"));
  }
}
