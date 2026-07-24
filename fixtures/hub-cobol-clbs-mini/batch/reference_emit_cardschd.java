// EXPECTED: 39.00
// Reference emit for CARDSCHD — multi-tran fee schedule SEARCH sum.
public final class CardschdRef {
  public static void main(String[] args) {
    java.util.Map<String, Double> schedule = java.util.Map.of(
        "P", 0.0200, "C", 0.0350, "F", 0.0500);
    Object[][] txns = {
      {"P", 800.00}, {"C", 400.00}, {"P", 200.00}, {"F", 100.00},
    };
    double total = 0.0;
    for (Object[] row : txns) {
      String code = (String) row[0];
      double amt = (Double) row[1];
      double rate = schedule.getOrDefault(code, 0.0);
      double fee = Math.round(amt * rate * 100.0 + 1e-9) / 100.0;
      total = Math.round((total + fee) * 100.0 + 1e-9) / 100.0;
    }
    System.out.printf("%.2f%n", total);
  }
}
