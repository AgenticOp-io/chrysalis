// EXPECTED: 55
// Reference emit for VARYSUM — PERFORM VARYING 1..10 sum.
using System;
public static class VarysumRef {
  public static void Main() {
    int total = 0;
    for (int i = 1; i <= 10; i++) total += i;
    Console.WriteLine(total);
  }
}
