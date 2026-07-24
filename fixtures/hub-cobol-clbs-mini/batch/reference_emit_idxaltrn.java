// EXPECTED: 88.25
// Reference emit for IDXALTRN — GnuCOBOL INDEXED ALTERNATE KEY read.
public final class IdxaltrnRef {
  public static void main(String[] args) {
    java.util.Map<String, Double> rows = java.util.Map.of(
        "ALT00010", 12.50, "ALT00088", 88.25);
    System.out.printf("%.2f%n", rows.get("ALT00088"));
  }
}
