// EXPECTED: 55
// Reference emit for ENTRYRN — CALL quoted ENTRY alternate path.
public final class EntryrnRef {
  public static void main(String[] args) {
    String entry = "ALTPHASE";
    int phase = "ALTPHASE".equals(entry) ? 55 : 10;
    System.out.printf("%02d%n", phase);
  }
}
