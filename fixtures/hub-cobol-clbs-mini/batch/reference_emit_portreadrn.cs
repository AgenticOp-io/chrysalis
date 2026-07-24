// EXPECTED: 4
// Reference emit for PORTREADRN — PORTREAD LINE SEQ record count.
using System;
public static class PortreadrnRef {
  public static void Main() {
    var rows = new (string Id, string Status)[] {
      ("PORT0001", "A"), ("PORT0002", "A"), ("PORT0003", "S"), ("PORT0004", "A")
    };
    Console.WriteLine(rows.Length);
  }
}
