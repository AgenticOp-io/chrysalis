// EXPECTED: 104
// Reference emit for PORTTRANRN — PORTTRAN type EVALUATE BU/SL/TR/FE.
using System;
using System.Collections.Generic;
public static class PorttranrnRef {
  public static void Main() {
    var types = new[] { "BU", "SL", "TR", "FE" };
    var codes = new Dictionary<string, int> {
      ["BU"] = 11, ["SL"] = 21, ["TR"] = 31, ["FE"] = 41
    };
    int total = 0;
    foreach (var t in types) total += codes[t];
    Console.WriteLine(total);
  }
}
