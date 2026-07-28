// EXPECTED: 66
// Reference emit for PORTFLIODN — PORTFLIO COPY-linked type+status RC sum.
public final class PortfliodnRef {
  static int typeRc(String t) {
    if ("I".equals(t)) return 10;
    if ("C".equals(t)) return 20;
    if ("T".equals(t)) return 30;
    return 99;
  }

  static int statusRc(String s) {
    if ("A".equals(s)) return 1;
    if ("C".equals(s)) return 2;
    if ("S".equals(s)) return 3;
    return 99;
  }

  public static void main(String[] args) {
    int total = 0;
    for (String t : new String[] {"I", "C", "T"}) total += typeRc(t);
    for (String s : new String[] {"A", "C", "S"}) total += statusRc(s);
    System.out.println(total);
  }
}
