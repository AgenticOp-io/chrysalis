// EXPECTED: 38
// Reference emit for UTLVALRN — UTLVAL00 FUNC-BAL USING path.
import java.util.Map;
public final class UtlvalrnRef {
  public static void main(String[] args) {
    String func = "BAL";
    int rc = Map.of("INIT", 0, "INTG", 8, "XREF", 18, "FMT", 28, "BAL", 38)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
