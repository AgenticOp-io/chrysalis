// EXPECTED: 63
// Reference emit for PORTUPDRN — PORTUPDT EVALUATE TRUE action RC sum.
import java.util.Map;
public final class PortupdrnRef {
  public static void main(String[] args) {
    String[] actions = {"S", "V", "N"};
    Map<String, Integer> codes = Map.of("S", 11, "V", 21, "N", 31);
    int total = 0;
    for (String a : actions) total += codes.getOrDefault(a, 0);
    System.out.printf("%02d%n", total);
  }
}
