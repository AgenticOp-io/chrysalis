// EXPECTED: 63
// Reference emit for PORTUPDRN — PORTUPDT EVALUATE TRUE action RC sum.
using System;
using System.Collections.Generic;
public static class PortupdrnRef {
  public static void Main() {
    string[] actions = { "S", "V", "N" };
    var codes = new Dictionary<string, int> { ["S"] = 11, ["V"] = 21, ["N"] = 31 };
    int total = 0;
    foreach (var a in actions) total += codes.TryGetValue(a, out var v) ? v : 0;
    Console.WriteLine(total.ToString("00"));
  }
}
