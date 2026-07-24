// EXPECTED: 63.00
// Reference emit for IDXEQNRN — INDEXED START EQUAL + READ NEXT ×3.
using System;
using System.Collections.Generic;
using System.Linq;
public static class IdxeqnrnRef {
  public static void Main() {
    var rows = new SortedDictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 20, limit = 3;
    double total = rows.Where(kv => kv.Key >= start).Take(limit).Sum(kv => kv.Value);
    Console.WriteLine(total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture));
  }
}
