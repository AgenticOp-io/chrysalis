// EXPECTED: 38
// Reference emit for UTLVALRN — UTLVAL00 FUNC-BAL USING path.
using System;
using System.Collections.Generic;
public static class UtlvalrnRef {
  public static void Main() {
    string func = "BAL";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["INTG"] = 8, ["XREF"] = 18, ["FMT"] = 28, ["BAL"] = 38
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
