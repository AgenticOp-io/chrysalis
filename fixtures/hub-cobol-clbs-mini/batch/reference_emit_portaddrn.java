// EXPECTED: 3
// Reference emit for PORTADDRN — PORTADD LINE SEQ validate+add count.
public final class PortaddrnRef {
  public static void main(String[] args) {
    String[][] rows = {
      {"PORT0001", "A"}, {"PORT0002", "A"}, {"", "A"}, {"PORT0003", "A"}
    };
    int count = 0;
    for (String[] r : rows) {
      if (!r[0].isBlank() && "A".equals(r[1])) count++;
    }
    System.out.println(count);
  }
}
