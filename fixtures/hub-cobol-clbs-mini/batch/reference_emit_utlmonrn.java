// EXPECTED: 26
// Reference emit for UTLMONRN — UTLMON00 FUNC-THRS USING path.
import java.util.Map;
public final class UtlmonrnRef {
  public static void main(String[] args) {
    String func = "THRS";
    int rc = Map.of("INIT", 0, "COLL", 16, "THRS", 26, "ALOG", 36, "ALRT", 46)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
