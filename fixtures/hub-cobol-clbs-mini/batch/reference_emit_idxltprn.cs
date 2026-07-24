// EXPECTED: 20.50
// Reference emit for IDXLTPRN — INDEXED START LESS THAN + READ PREV.
using System;
using System.Collections.Generic;
public static class IdxltprnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 42;
    double total = 0;
    foreach (var e in rows) {
      if (e.Key < start) total += e.Value;
    }
    Console.WriteLine(total.ToString("0.00"));
  }
}
