// EXPECTED: 90.50
// Reference emit for IDXLTNRN — INDEXED START LESS + READ NEXT.
using System;
using System.Collections.Generic;
public static class IdxltnrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 20;
    int? pos = null;
    foreach (var k in rows.Keys) {
      if (k < start && (pos == null || k > pos)) pos = k;
    }
    double total = 0;
    if (pos != null) {
      foreach (var e in rows) if (e.Key >= pos.Value) total += e.Value;
    }
    Console.WriteLine(total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
  }
}
