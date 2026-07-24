// EXPECTED: 12
// Reference emit for RCVPRCRN — RCVPRC00 FUNC-RECV USING path.
import java.util.Map;
public final class RcvprcrnRef {
  public static void main(String[] args) {
    String func = "RECV";
    int rc = Map.of("INIT", 0, "RECV", 12, "TERM", 22)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
