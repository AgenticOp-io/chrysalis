// EXPECTED: 20.50
// Reference emit for IDXLTPRN — INDEXED START LESS THAN + READ PREV.
import java.util.Map;
public final class IdxltprnRef {
  public static void main(String[] args) {
    Map<Integer, Double> rows = Map.of(
        10, 12.50, 20, 8.00, 42, 25.00, 55, 30.00, 99, 15.00);
    int start = 42;
    double total = 0;
    for (var e : rows.entrySet()) {
      if (e.getKey() < start) total += e.getValue();
    }
    System.out.printf("%.2f%n", total);
  }
}
