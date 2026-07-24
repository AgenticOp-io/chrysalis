// EXPECTED: 100.00
// Reference emit for CARDACCF — multi-account fee table (WHEN/IF/COMPUTE).
using System;
public static class CardaccfRef {
  public static void Main() {
    double rateA = 0.0200;
    double rateD = 0.0550;
    double lateFee = 25.00;
    (string status, double bal, int days)[] accounts = {
      ("A", 1000.00, 0),
      ("D", 1000.00, 45),
      ("C", 500.00, 0),
    };
    double total = 0.0;
    foreach (var (status, bal, days) in accounts) {
      double fee = status switch {
        "A" => Math.Round(bal * rateA + 1e-12, 2),
        "D" => Math.Round(bal * rateD + 1e-12, 2),
        _ => 0.0,
      };
      if (status == "D" && days > 30) {
        fee = Math.Round(fee + lateFee + 1e-12, 2);
      }
      total = Math.Round(total + fee + 1e-12, 2);
    }
    Console.WriteLine(total.ToString("0.00"));
  }
}
