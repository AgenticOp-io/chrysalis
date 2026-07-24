// EXPECTED: 33.00
// Reference emit for IDXEQPRN — INDEXED START EQUAL + 2× READ PREV.
public final class IdxeqprnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = java.util.Map.of(
        10, 12.50, 20, 8.00, 42, 25.00, 55, 30.00, 99, 15.00);
    int start = 42;
    int limit = 2;
    double total = rows.entrySet().stream()
        .filter(e -> e.getKey() <= start)
        .sorted((a, b) -> Integer.compare(b.getKey(), a.getKey()))
        .limit(limit)
        .mapToDouble(java.util.Map.Entry::getValue)
        .sum();
    System.out.printf("%.2f%n", total);
  }
}
