// EXPECTED: 69.44
// Reference emit for CARDBILL — fee + late IF + interest pipeline.
using System;
public static class CardbillRef {
  public static void Main() {
    double bal = 1000.00;
    double feeRate = 0.0290;
    double intRate = 0.0150;
    int daysLate = 45;
    double lateFee = 25.00;
    double fee = Math.Round(bal * feeRate, 2, MidpointRounding.AwayFromZero);
    double late = daysLate > 30 ? lateFee : 0.0;
    double interest = Math.Round((bal + fee) * intRate, 2, MidpointRounding.AwayFromZero);
    double total = Math.Round(fee + late + interest, 2, MidpointRounding.AwayFromZero);
    Console.WriteLine(total.ToString("F2"));
  }
}
