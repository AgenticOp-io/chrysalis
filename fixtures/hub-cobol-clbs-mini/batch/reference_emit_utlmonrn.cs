// EXPECTED: 26
// Reference emit for UTLMONRN — UTLMON00 FUNC-THRS USING path.
using System;
using System.Collections.Generic;
public static class UtlmonrnRef {
  public static void Main() {
    string func = "THRS";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["COLL"] = 16, ["THRS"] = 26, ["ALOG"] = 36, ["ALRT"] = 46
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
