// EXPECTED: 150
// Reference emit for CKPRSTDN — CKPRST COPY-linked status 88 RC sum.
public final class CkprstdnRef {
  static int statusRc(String status) {
    if ("I".equals(status)) return 10;
    if ("A".equals(status)) return 20;
    if ("C".equals(status)) return 30;
    if ("F".equals(status)) return 40;
    if ("R".equals(status)) return 50;
    return 99;
  }

  public static void main(String[] args) {
    int total = 0;
    for (String s : new String[] {"I", "A", "C", "F", "R"}) {
      total += statusRc(s);
    }
    System.out.println(total);
  }
}
