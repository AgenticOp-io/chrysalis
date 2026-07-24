// EXPECTED: 39.00
// Reference emit for CARDSCHD — multi-tran fee schedule SEARCH sum.
using System;
using System.Collections.Generic;
public static class CardschdRef {
  public static void Main() {
    var schedule = new Dictionary<string, double> {
      ["P"] = 0.0200, ["C"] = 0.0350, ["F"] = 0.0500,
    };
    (string code, double amt)[] txns = {
      ("P", 800.00), ("C", 400.00), ("P", 200.00), ("F", 100.00),
    };
    double total = 0.0;
    foreach (var (code, amt) in txns) {
      double rate = schedule.TryGetValue(code, out var r) ? r : 0.0;
      double fee = Math.Round(amt * rate + 1e-12, 2);
      total = Math.Round(total + fee + 1e-12, 2);
    }
    Console.WriteLine(total.ToString("0.00"));
  }
}
