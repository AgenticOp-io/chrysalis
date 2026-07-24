// EXPECTED: 44.44
// Reference emit for CARDFEEIN — CardDemo fee→interest multi-COMPUTE chain.
using System;
public static class CardfeeinRef {
  public static void Main() {
    double bal = 1000.00;
    double feeRate = 0.0290;
    double intRate = 0.0150;
    double fee = Math.Round(bal * feeRate, 2);
    double interest = Math.Round((bal + fee) * intRate, 2);
    double total = Math.Round(fee + interest, 2);
    Console.WriteLine(total.ToString("0.00"));
  }
}
