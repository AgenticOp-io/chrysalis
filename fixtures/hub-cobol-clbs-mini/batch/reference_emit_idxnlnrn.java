// EXPECTED: 78.00
// Reference emit for IDXNLNRN — INDEXED START NOT LESS + READ NEXT.
import java.util.*;
public final class IdxnlnrnRef {
  public static void main(String[] args) {
    Map<Integer, Double> rows = new HashMap<>();
    rows.put(10, 12.50); rows.put(20, 8.00); rows.put(42, 25.00);
    rows.put(55, 30.00); rows.put(99, 15.00);
    int start = 20;
    double total = 0;
    for (Map.Entry<Integer, Double> e : rows.entrySet()) {
      if (e.getKey() >= start) total += e.getValue();
    }
    System.out.printf(Locale.US, "%.2f%n", total);
  }
}
