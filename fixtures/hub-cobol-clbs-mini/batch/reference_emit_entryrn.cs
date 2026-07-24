// EXPECTED: 55
// Reference emit for ENTRYRN — CALL quoted ENTRY alternate path.
using System;
public static class EntryrnRef {
  public static void Main() {
    string entry = "ALTPHASE";
    int phase = entry == "ALTPHASE" ? 55 : 10;
    Console.WriteLine(phase.ToString("D2"));
  }
}
