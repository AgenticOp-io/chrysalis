// EXPECTED: 4
// Reference emit for PORTREADRN — PORTREAD LINE SEQ record count.
public final class PortreadrnRef {
  public static void main(String[] args) {
    String[][] rows = {
      {"PORT0001", "A"}, {"PORT0002", "A"}, {"PORT0003", "S"}, {"PORT0004", "A"}
    };
    System.out.println(rows.length);
  }
}
