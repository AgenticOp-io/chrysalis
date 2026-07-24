// EXPECTED: 10
// Reference emit for PRCSEQRN — PRCSEQ00 FUNC-NEXT USING path.
using System;
public static class PrcseqrnRef {
  public static void Main() {
    string func = "NEXT";
    int rc = func switch {
      "INIT" => 0,
      "NEXT" => 10,
      "STAT" => 20,
      "TERM" => 30,
      _ => 99,
    };
    Console.WriteLine(rc.ToString("00"));
  }
}
