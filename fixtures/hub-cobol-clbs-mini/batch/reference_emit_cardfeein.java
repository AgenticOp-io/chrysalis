// EXPECTED: 44.44
// Reference emit for CARDFEEIN — CardDemo fee→interest multi-COMPUTE chain.
public final class CardfeeinRef {
  public static void main(String[] args) {
    double bal = 1000.00;
    double feeRate = 0.0290;
    double intRate = 0.0150;
    double fee = Math.round(bal * feeRate * 100.0) / 100.0;
    double interest = Math.round((bal + fee) * intRate * 100.0) / 100.0;
    double total = Math.round((fee + interest) * 100.0) / 100.0;
    System.out.printf("%.2f%n", total);
  }
}
