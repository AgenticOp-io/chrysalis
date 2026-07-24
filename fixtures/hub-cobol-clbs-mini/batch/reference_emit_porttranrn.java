// EXPECTED: 104
// Reference emit for PORTTRANRN — PORTTRAN type EVALUATE BU/SL/TR/FE.
public final class PorttranrnRef {
  public static void main(String[] args) {
    String[] types = {"BU", "SL", "TR", "FE"};
    java.util.Map<String, Integer> codes = java.util.Map.of(
        "BU", 11, "SL", 21, "TR", 31, "FE", 41);
    int total = 0;
    for (String t : types) total += codes.get(t);
    System.out.println(total);
  }
}
