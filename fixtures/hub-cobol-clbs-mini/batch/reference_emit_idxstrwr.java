// EXPECTED: 82.50
// Reference emit for IDXSTRWR — GnuCOBOL INDEXED START + REWRITE.
public final class IdxstrwrRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Double> rows = new java.util.HashMap<Integer, Double>() {{
      put(10, 12.50);
      put(42, 77.50);
    }};
    System.out.printf("%.2f%n", rows.get(42) + 5.00);
  }
}
