// EXPECTED: 72
// Reference emit for UTLMNTLS — UTLMNT00 LINE SEQ control sum.
using System;
using System.Collections.Generic;
public static class UtlmntlsRef {
  public static void Main() {
    var funcs = new[] { "ARCHIVE", "CLEANUP", "REORG" };
    var codes = new Dictionary<string, int> {
      ["ARCHIVE"] = 14, ["CLEANUP"] = 24, ["REORG"] = 34, ["ANALYZE"] = 44
    };
    int total = 0;
    foreach (var f in funcs) total += codes[f];
    Console.WriteLine(total.ToString("00"));
  }
}
