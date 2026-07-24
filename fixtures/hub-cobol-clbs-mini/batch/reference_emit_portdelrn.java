// EXPECTED: 60
// Reference emit for PORTDELRN — PORTDEL reason EVALUATE TRUE RC sum.
public final class PortdelrnRef {
  public static void main(String[] args) {
    String[] reasons = {"01", "02", "03"};
    java.util.Map<String, Integer> codes = java.util.Map.of("01", 10, "02", 20, "03", 30);
    int total = 0;
    for (String r : reasons) total += codes.get(r);
    System.out.printf("%02d%n", total);
  }
}
