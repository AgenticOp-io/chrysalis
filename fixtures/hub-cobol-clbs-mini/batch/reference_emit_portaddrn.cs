// EXPECTED: 3
// Reference emit for PORTADDRN — PORTADD LINE SEQ validate+add count.
using System;
public static class PortaddrnRef {
  public static void Main() {
    var rows = new (string Id, string Status)[] {
      ("PORT0001", "A"), ("PORT0002", "A"), ("", "A"), ("PORT0003", "A")
    };
    int count = 0;
    foreach (var r in rows) {
      if (!string.IsNullOrWhiteSpace(r.Id) && r.Status == "A") count++;
    }
    Console.WriteLine(count);
  }
}
