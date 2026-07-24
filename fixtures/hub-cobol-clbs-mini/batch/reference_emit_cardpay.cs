// EXPECTED: 125.00
// Reference emit for CARDPAY — EVALUATE pay option + late IF.
using System;
public static class CardpayRef {
  public static void Main() {
    string option = "P";
    double bal = 1000.00;
    double pct = 0.1000;
    double minPay = 50.00;
    int daysLate = 45;
    double lateFee = 25.00;
    double pay = option switch {
      "F" => bal,
      "P" => Math.Round(bal * pct, 2, MidpointRounding.AwayFromZero),
      "M" => minPay,
      _ => 0.0,
    };
    double total = daysLate > 30
      ? Math.Round(pay + lateFee, 2, MidpointRounding.AwayFromZero)
      : pay;
    Console.WriteLine(total.ToString("F2"));
  }
}
