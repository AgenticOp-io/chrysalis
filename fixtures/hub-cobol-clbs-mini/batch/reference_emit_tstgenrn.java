// EXPECTED: 76
// Reference emit for TSTGENRN — TSTGEN00 LINE SEQ config type sum.
import java.util.Map;
public final class TstgenrnRef {
  public static void main(String[] args) {
    String[] funcs = {"PORTFOLIO", "TRANSACTN", "VOLUME"};
    Map<String, Integer> codes = Map.of(
        "PORTFOLIO", 12, "TRANSACTN", 22, "ERROR", 32, "VOLUME", 42);
    int total = 0;
    for (String f : funcs) total += codes.getOrDefault(f, 0);
    System.out.printf("%02d%n", total);
  }
}
