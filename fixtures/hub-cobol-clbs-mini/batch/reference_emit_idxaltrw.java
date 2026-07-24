// EXPECTED: 92.25
// Reference emit for IDXALTRW — GnuCOBOL INDEXED alt-key START+REWRITE.
public final class IdxaltrwRef {
  public static void main(String[] args) {
    java.util.Map<String, Double> rows = new java.util.HashMap<>();
    rows.put("ALT00010", 12.50);
    rows.put("ALT00088", 88.25);
    System.out.printf("%.2f%n", rows.get("ALT00088") + 4.00);
  }
}
