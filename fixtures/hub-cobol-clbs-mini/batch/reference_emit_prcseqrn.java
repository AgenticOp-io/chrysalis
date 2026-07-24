// EXPECTED: 10
// Reference emit for PRCSEQRN — PRCSEQ00 FUNC-NEXT USING path.
public final class PrcseqrnRef {
  public static void main(String[] args) {
    String func = "NEXT";
    int rc;
    switch (func) {
      case "INIT": rc = 0; break;
      case "NEXT": rc = 10; break;
      case "STAT": rc = 20; break;
      case "TERM": rc = 30; break;
      default: rc = 99; break;
    }
    System.out.printf("%02d%n", rc);
  }
}
