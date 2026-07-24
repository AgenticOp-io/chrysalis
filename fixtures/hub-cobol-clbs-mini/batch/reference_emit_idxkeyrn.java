// EXPECTED: 77.50
// Reference emit for IDXKEYRN — sequential key scan (VSAM substitute).
public final class IdxkeyrnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = java.util.Map.of(10, 12.50, 42, 77.50, 99, 1.00);
    System.out.printf("%.2f%n", rows.get(42));
  }
}
