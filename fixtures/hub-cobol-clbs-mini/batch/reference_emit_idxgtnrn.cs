// EXPECTED: 45.00
// Reference emit for IDXGTNRN — GnuCOBOL INDEXED START > + READ NEXT.
using System;
using System.Collections.Generic;
public static class IdxgtnrnRef {
  public static void Main() {
    var rows = new Dictionary<int, double> {
      [10] = 12.50, [20] = 8.00, [42] = 25.00, [55] = 30.00, [99] = 15.00
    };
    int start = 42;
    double total = 0;
    foreach (var e in rows) if (e.Key > start) total += e.Value;
    Console.WriteLine(total.ToString("0.00"));
  }
}
