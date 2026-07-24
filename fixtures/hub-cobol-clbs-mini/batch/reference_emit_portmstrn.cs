// EXPECTED: 108
// Reference emit for PORTMSTRN — PORTMSTR C/R/U/D USING path.
using System;
using System.Collections.Generic;
public static class PortmstrnRef {
  public static void Main() {
    string[] cmds = { "C", "R", "U", "D" };
    var codes = new Dictionary<string, int> {
      ["C"] = 12, ["R"] = 22, ["U"] = 32, ["D"] = 42
    };
    int total = 0;
    foreach (var c in cmds) total += codes.TryGetValue(c, out var v) ? v : 99;
    Console.WriteLine(total.ToString("000"));
  }
}
