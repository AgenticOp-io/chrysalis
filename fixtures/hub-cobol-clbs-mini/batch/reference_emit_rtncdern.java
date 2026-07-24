// EXPECTED: 06
// Reference emit for RTNCDERN — RTNCDE00 FUNC-SETC USING path.
import java.util.Map;
public final class RtncdernRef {
  public static void main(String[] args) {
    String func = "SETC";
    int rc = Map.of("INIT", 0, "SETC", 6, "GETC", 16, "ANLZ", 26)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
