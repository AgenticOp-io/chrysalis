// EXPECTED: 75.50
// Reference emit for IDXNGPRN — INDEXED START NOT GREATER + READ PREV.
import java.util.*;
public final class IdxngprnRef {
  public static void main(String[] args) {
    Map<Integer, Double> rows = new HashMap<>();
    rows.put(10, 12.50); rows.put(20, 8.00); rows.put(42, 25.00);
    rows.put(55, 30.00); rows.put(99, 15.00);
    int start = 55;
    double total = 0;
    for (Map.Entry<Integer, Double> e : rows.entrySet()) {
      if (e.getKey() <= start) total += e.getValue();
    }
    System.out.printf(Locale.US, "%.2f%n", total);
  }
}
