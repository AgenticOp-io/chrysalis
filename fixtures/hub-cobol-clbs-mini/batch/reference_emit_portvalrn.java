// EXPECTED: 31
// Reference emit for PORTVALRN — PORTVALD FUNC-VTYP USING path.
import java.util.Map;
public final class PortvalrnRef {
  public static void main(String[] args) {
    String func = "VTYP";
    int rc = Map.of("INIT", 0, "VID", 11, "VACT", 21, "VTYP", 31, "VAMT", 41)
        .getOrDefault(func, 99);
    System.out.printf("%02d%n", rc);
  }
}
