// EXPECTED: 82.50
// Reference emit for IDXUPDRN — sequential key update (VSAM REWRITE substitute).
public final class IdxupdrnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = java.util.Map.of(10, 12.50, 42, 77.50, 99, 1.00);
    double delta = 5.00;
    System.out.printf("%.2f%n", rows.get(42) + delta);
  }
}
