// EXPECTED: 14
// Reference emit for UTLMNTRN — UTLMNT00 FUNC-ARCH USING path.
using System;
using System.Collections.Generic;
public static class UtlmntrnRef {
  public static void Main() {
    string func = "ARCH";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["ARCH"] = 14, ["CLEN"] = 24, ["REOR"] = 34, ["ANYS"] = 44
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
