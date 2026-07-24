// EXPECTED: 350
// Reference emit for SRCHTAB — OCCURS + SEARCH keyed lookup.
using System;
using System.Collections.Generic;
public static class SrchtabRef {
  public static void Main() {
    var table = new Dictionary<int, int> { {10, 100}, {20, 200}, {30, 350}, {40, 400} };
    int find = 30;
    int result = table.TryGetValue(find, out var v) ? v : 0;
    Console.WriteLine(result);
  }
}
