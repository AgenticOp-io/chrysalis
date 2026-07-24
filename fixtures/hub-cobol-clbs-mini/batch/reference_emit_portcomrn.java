// EXPECTED: 120
// Reference emit for PORTCOMRN — PORTCOM COPY CRUD EVALUATE.
import java.util.Map;
public final class PortcomrnRef {
  public static void main(String[] args) {
    String[] cmds = {"CREA", "READ", "UPDT", "DELE"};
    Map<String, Integer> codes = Map.of("CREA", 15, "READ", 25, "UPDT", 35, "DELE", 45);
    int total = 0;
    for (String c : cmds) total += codes.getOrDefault(c, 99);
    System.out.printf("%03d%n", total);
  }
}
