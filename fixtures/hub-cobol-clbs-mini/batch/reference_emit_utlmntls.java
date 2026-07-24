// EXPECTED: 72
// Reference emit for UTLMNTLS — UTLMNT00 LINE SEQ control sum.
import java.util.List;
import java.util.Map;
public final class UtlmntlsRef {
  public static void main(String[] args) {
    var funcs = List.of("ARCHIVE", "CLEANUP", "REORG");
    var codes = Map.of("ARCHIVE", 14, "CLEANUP", 24, "REORG", 34, "ANALYZE", 44);
    int total = 0;
    for (String f : funcs) total += codes.get(f);
    System.out.printf("%02d%n", total);
  }
}
