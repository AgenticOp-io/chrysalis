// EXPECTED: 76
// Reference emit for TSTGENRN — TSTGEN00 LINE SEQ config type sum.
using System;
using System.Collections.Generic;
public static class TstgenrnRef {
  public static void Main() {
    string[] funcs = { "PORTFOLIO", "TRANSACTN", "VOLUME" };
    var codes = new Dictionary<string, int> {
      ["PORTFOLIO"] = 12, ["TRANSACTN"] = 22, ["ERROR"] = 32, ["VOLUME"] = 42
    };
    int total = 0;
    foreach (var f in funcs) total += codes.TryGetValue(f, out var v) ? v : 0;
    Console.WriteLine(total.ToString("00"));
  }
}
