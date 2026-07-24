// EXPECTED: 60
// Reference emit for PORTDELRN — PORTDEL reason EVALUATE TRUE RC sum.
using System;
using System.Collections.Generic;
public static class PortdelrnRef {
  public static void Main() {
    var reasons = new[] { "01", "02", "03" };
    var codes = new Dictionary<string, int> { ["01"] = 10, ["02"] = 20, ["03"] = 30 };
    int total = 0;
    foreach (var r in reasons) total += codes[r];
    Console.WriteLine($"{total:D2}");
  }
}
