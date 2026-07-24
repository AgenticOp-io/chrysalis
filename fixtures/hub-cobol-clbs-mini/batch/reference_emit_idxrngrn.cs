// EXPECTED: 70.00
// Reference emit for IDXRNGRN — START-from-key range sum (VSAM START substitute).
using System;
using System.Collections.Generic;
using System.Linq;
public static class IdxrngrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      {10, 12.50}, {20, 8.00}, {42, 25.00}, {55, 30.00}, {99, 15.00}
    };
    var total = rows.Where(kv => kv.Key >= 42).Sum(kv => kv.Value);
    Console.WriteLine(total.ToString("0.00"));
  }
}
