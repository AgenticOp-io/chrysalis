// EXPECTED: 80.00
// Reference emit for CARDSTAT — multi-status × multi-rate (beyond CARDPAY).
using System;
public static class CardstatRef {
  public static void Main() {
    string status = "D";
    double bal = 1000.00;
    double rateA = 0.0200;
    double rateD = 0.0550;
    int daysLate = 45;
    double lateFee = 25.00;
    double fee = status switch {
      "A" => Math.Round(bal * rateA + 1e-12, 2),
      "D" => Math.Round(bal * rateD + 1e-12, 2),
      "C" => 0.0,
      _ => 0.0,
    };
    double total = (status == "D" && daysLate > 30)
      ? Math.Round(fee + lateFee + 1e-12, 2)
      : fee;
    Console.WriteLine(total.ToString("0.00"));
  }
}
