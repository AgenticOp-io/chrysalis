// EXPECTED: 15
// Reference emit for BCHCTLRN — BCHCTL00 FUNC-CHEK USING path.
import java.util.Map;
public final class BchctlrnRef {
  public static void main(String[] args) {
    String func = "CHEK";
    int rc = Map.of("INIT", 0, "CHEK", 15, "UPDT", 25, "TERM", 35)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
