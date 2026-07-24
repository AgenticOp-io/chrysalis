// EXPECTED: 80.00
// Reference emit for CARDSTAT — multi-status × multi-rate (beyond CARDPAY).
public final class CardstatRef {
  public static void main(String[] args) {
    String status = "D";
    double bal = 1000.00;
    double rateA = 0.0200;
    double rateD = 0.0550;
    int daysLate = 45;
    double lateFee = 25.00;
    double fee;
    switch (status) {
      case "A":
        fee = Math.round(bal * rateA * 100.0 + 1e-9) / 100.0;
        break;
      case "D":
        fee = Math.round(bal * rateD * 100.0 + 1e-9) / 100.0;
        break;
      case "C":
      default:
        fee = 0.0;
        break;
    }
    double total =
        ("D".equals(status) && daysLate > 30)
            ? Math.round((fee + lateFee) * 100.0 + 1e-9) / 100.0
            : fee;
    System.out.printf("%.2f%n", total);
  }
}
