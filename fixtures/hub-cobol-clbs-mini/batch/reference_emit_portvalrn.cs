// EXPECTED: 31
// Reference emit for PORTVALRN — PORTVALD FUNC-VTYP USING path.
using System;
using System.Collections.Generic;
public static class PortvalrnRef {
  public static void Main() {
    string func = "VTYP";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["VID"] = 11, ["VACT"] = 21, ["VTYP"] = 31, ["VAMT"] = 41
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
