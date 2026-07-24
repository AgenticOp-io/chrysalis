// EXPECTED: 100.00
// Reference emit for CARDACCF — multi-account fee table (WHEN/IF/COMPUTE).
public final class CardaccfRef {
  public static void main(String[] args) {
    double rateA = 0.0200;
    double rateD = 0.0550;
    double lateFee = 25.00;
    Object[][] accounts = {
      {"A", 1000.00, 0},
      {"D", 1000.00, 45},
      {"C", 500.00, 0},
    };
    double total = 0.0;
    for (Object[] row : accounts) {
      String status = (String) row[0];
      double bal = (Double) row[1];
      int days = (Integer) row[2];
      double fee;
      switch (status) {
        case "A":
          fee = Math.round(bal * rateA * 100.0 + 1e-9) / 100.0;
          break;
        case "D":
          fee = Math.round(bal * rateD * 100.0 + 1e-9) / 100.0;
          if (days > 30) {
            fee = Math.round((fee + lateFee) * 100.0 + 1e-9) / 100.0;
          }
          break;
        default:
          fee = 0.0;
          break;
      }
      total = Math.round((total + fee) * 100.0 + 1e-9) / 100.0;
    }
    System.out.printf("%.2f%n", total);
  }
}
