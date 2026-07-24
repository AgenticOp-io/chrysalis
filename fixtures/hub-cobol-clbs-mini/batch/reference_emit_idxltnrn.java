// EXPECTED: 90.50
// Reference emit for IDXLTNRN — INDEXED START LESS + READ NEXT.
import java.util.*;
public final class IdxltnrnRef {
  public static void main(String[] args) {
    Map<Integer, Double> rows = new HashMap<>();
    rows.put(10, 12.50); rows.put(20, 8.00); rows.put(42, 25.00);
    rows.put(55, 30.00); rows.put(99, 15.00);
    int start = 20;
    Integer pos = null;
    for (int k : rows.keySet()) {
      if (k < start && (pos == null || k > pos)) pos = k;
    }
    double total = 0;
    if (pos != null) {
      for (Map.Entry<Integer, Double> e : rows.entrySet()) {
        if (e.getKey() >= pos) total += e.getValue();
      }
    }
    System.out.printf(Locale.US, "%.2f%n", total);
  }
}
