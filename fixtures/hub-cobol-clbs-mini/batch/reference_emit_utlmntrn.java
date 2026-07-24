// EXPECTED: 14
// Reference emit for UTLMNTRN — UTLMNT00 FUNC-ARCH USING path.
import java.util.Map;
public final class UtlmntrnRef {
  public static void main(String[] args) {
    String func = "ARCH";
    int rc = Map.of("INIT", 0, "ARCH", 14, "CLEN", 24, "REOR", 34, "ANYS", 44)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
