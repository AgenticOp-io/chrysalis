// EXPECTED: 25
// Reference emit for EVALMANY — multi-WHEN EVALUATE.
using System;
public static class EvalmanyRef {
  public static void Main() {
    int code = 2;
    int fee = code switch {
      1 => 10,
      2 => 25,
      3 => 40,
      _ => 99
    };
    Console.WriteLine(fee);
  }
}
