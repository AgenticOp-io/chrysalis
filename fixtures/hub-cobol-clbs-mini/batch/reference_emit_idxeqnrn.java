// EXPECTED: 63.00
// Reference emit for IDXEQNRN — INDEXED START EQUAL + READ NEXT ×3.
import java.util.*;
public final class IdxeqnrnRef {
  public static void main(String[] args) {
    NavigableMap<Integer, Double> rows = new TreeMap<>();
    rows.put(10, 12.50); rows.put(20, 8.00); rows.put(42, 25.00);
    rows.put(55, 30.00); rows.put(99, 15.00);
    int start = 20, limit = 3, n = 0;
    double total = 0;
    for (Map.Entry<Integer, Double> e : rows.tailMap(start, true).entrySet()) {
      if (n++ >= limit) break;
      total += e.getValue();
    }
    System.out.printf(Locale.US, "%.2f%n", total);
  }
}
