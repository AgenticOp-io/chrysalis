// EXPECTED: 100
// Reference emit for CKPRSTPH — CKPRST COPY-linked phase 88 RC sum.
public final class CkprstphRef {
  static int phaseRc(String p) {
    if ("00".equals(p)) return 0;
    if ("10".equals(p)) return 10;
    if ("20".equals(p)) return 20;
    if ("30".equals(p)) return 30;
    if ("40".equals(p)) return 40;
    return 99;
  }

  public static void main(String[] args) {
    int total = 0;
    for (String p : new String[] {"00", "10", "20", "30", "40"}) {
      total += phaseRc(p);
    }
    System.out.println(total);
  }
}
