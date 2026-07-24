// EXPECTED: 31
// Reference emit for TSTVALRN — TSTVAL00 FUNC-PERF USING path.
using System;
using System.Collections.Generic;
public static class TstvalrnRef {
  public static void Main() {
    string func = "PERF";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["FUNC"] = 11, ["INTG"] = 21, ["PERF"] = 31, ["ERR"] = 41
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
