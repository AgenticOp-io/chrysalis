// EXPECTED: 69.44
// Reference emit for CARDBILL — fee + late IF + interest pipeline.
public final class CardbillRef {
  public static void main(String[] args) {
    double bal = 1000.00;
    double feeRate = 0.0290;
    double intRate = 0.0150;
    int daysLate = 45;
    double lateFee = 25.00;
    double fee = Math.round(bal * feeRate * 100.0) / 100.0;
    double late = daysLate > 30 ? lateFee : 0.0;
    double interest = Math.round((bal + fee) * intRate * 100.0) / 100.0;
    double total = Math.round((fee + late + interest) * 100.0) / 100.0;
    System.out.printf("%.2f%n", total);
  }
}
