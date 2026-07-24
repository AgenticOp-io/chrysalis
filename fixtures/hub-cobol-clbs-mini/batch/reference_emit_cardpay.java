// EXPECTED: 125.00
// Reference emit for CARDPAY — EVALUATE pay option + late IF.
public final class CardpayRef {
  public static void main(String[] args) {
    String option = "P";
    double bal = 1000.00;
    double pct = 0.1000;
    double minPay = 50.00;
    int daysLate = 45;
    double lateFee = 25.00;
    double pay;
    switch (option) {
      case "F" -> pay = bal;
      case "P" -> pay = Math.round(bal * pct * 100.0) / 100.0;
      case "M" -> pay = minPay;
      default -> pay = 0.0;
    }
    double total = daysLate > 30 ? Math.round((pay + lateFee) * 100.0) / 100.0 : pay;
    System.out.printf("%.2f%n", total);
  }
}
