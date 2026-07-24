// EXPECTED: 120
// Reference emit for PORTCOMRN — PORTCOM COPY CRUD EVALUATE.
using System;
using System.Collections.Generic;
public static class PortcomrnRef {
  public static void Main() {
    string[] cmds = { "CREA", "READ", "UPDT", "DELE" };
    var codes = new Dictionary<string, int> {
      ["CREA"] = 15, ["READ"] = 25, ["UPDT"] = 35, ["DELE"] = 45
    };
    int total = 0;
    foreach (var c in cmds) total += codes.TryGetValue(c, out var v) ? v : 99;
    Console.WriteLine(total.ToString("000"));
  }
}
