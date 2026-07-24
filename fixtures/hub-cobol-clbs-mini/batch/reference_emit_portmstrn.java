// EXPECTED: 108
// Reference emit for PORTMSTRN — PORTMSTR C/R/U/D USING path.
import java.util.Map;
public final class PortmstrnRef {
  public static void main(String[] args) {
    String[] cmds = {"C", "R", "U", "D"};
    Map<String, Integer> codes = Map.of("C", 12, "R", 22, "U", 32, "D", 42);
    int total = 0;
    for (String c : cmds) total += codes.getOrDefault(c, 99);
    System.out.printf("%03d%n", total);
  }
}
