// EXPECTED: 70.00
// Reference emit for IDXNGTRN — INDEXED START NOT GREATER + READ NEXT.
public final class IdxngtrnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = java.util.Map.of(
        10, 12.50, 20, 8.00, 42, 25.00, 55, 30.00, 99, 15.00);
    int start = 42;
    double total = rows.entrySet().stream()
        .filter(e -> e.getKey() >= start)
        .mapToDouble(java.util.Map.Entry::getValue)
        .sum();
    System.out.printf("%.2f%n", total);
  }
}
