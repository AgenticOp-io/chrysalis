// EXPECTED: 15
// Reference emit for BCHCTLRN — BCHCTL00 FUNC-CHEK USING path.
using System;
using System.Collections.Generic;
public static class BchctlrnRef {
  public static void Main() {
    string func = "CHEK";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["CHEK"] = 15, ["UPDT"] = 25, ["TERM"] = 35
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
