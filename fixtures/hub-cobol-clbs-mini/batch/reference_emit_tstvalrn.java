// EXPECTED: 31
// Reference emit for TSTVALRN — TSTVAL00 FUNC-PERF USING path.
import java.util.Map;
public final class TstvalrnRef {
  public static void main(String[] args) {
    String func = "PERF";
    int rc = Map.of("INIT", 0, "FUNC", 11, "INTG", 21, "PERF", 31, "ERR", 41)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
