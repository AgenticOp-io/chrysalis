// EXPECTED: 70.00
// Reference emit for IDXRNGRN — START-from-key range sum (VSAM START substitute).
public final class IdxrngrnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows =
        java.util.Map.of(10, 12.50, 20, 8.00, 42, 25.00, 55, 30.00, 99, 15.00);
    double total = 0;
    for (var e : rows.entrySet()) {
      if (e.getKey() >= 42) total += e.getValue();
    }
    System.out.printf("%.2f%n", total);
  }
}
