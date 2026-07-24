// EXPECTED: 70.00
// Reference emit for IDXNGTRN — INDEXED START NOT GREATER + READ NEXT.
using System;
using System.Linq;
using System.Collections.Generic;
public static class IdxngtrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 42;
    double total = rows.Where(e => e.Key >= start).Sum(e => e.Value);
    Console.WriteLine($"{total:0.00}");
  }
}
