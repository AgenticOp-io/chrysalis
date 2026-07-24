// EXPECTED: 77.50
// Reference emit for IDXDELRN — GnuCOBOL INDEXED DELETE remaining key.
public final class IdxdelrnRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = new java.util.HashMap<>();
    rows.put(10, 12.50);
    rows.put(42, 77.50);
    rows.remove(10);
    System.out.printf("%.2f%n", rows.get(42));
  }
}
