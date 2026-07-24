// EXPECTED: 33.00
// Reference emit for IDXEQPRN — INDEXED START EQUAL + 2× READ PREV.
using System;
using System.Linq;
using System.Collections.Generic;
public static class IdxeqprnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 42;
    int limit = 2;
    double total = rows.Where(e => e.Key <= start)
        .OrderByDescending(e => e.Key)
        .Take(limit)
        .Sum(e => e.Value);
    Console.WriteLine($"{total:0.00}");
  }
}
