// EXPECTED: 12
// Reference emit for RCVPRCRN — RCVPRC00 FUNC-RECV USING path.
using System;
using System.Collections.Generic;
public static class RcvprcrnRef {
  public static void Main() {
    string func = "RECV";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["RECV"] = 12, ["TERM"] = 22
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
