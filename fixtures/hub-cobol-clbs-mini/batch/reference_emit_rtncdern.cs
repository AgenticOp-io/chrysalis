// EXPECTED: 06
// Reference emit for RTNCDERN — RTNCDE00 FUNC-SETC USING path.
using System;
using System.Collections.Generic;
public static class RtncdernRef {
  public static void Main() {
    string func = "SETC";
    var codes = new Dictionary<string, int> {
      ["INIT"] = 0, ["SETC"] = 6, ["GETC"] = 16, ["ANLZ"] = 26
    };
    int rc = codes.TryGetValue(func, out var v) ? v : 99;
    Console.WriteLine(rc.ToString("00"));
  }
}
