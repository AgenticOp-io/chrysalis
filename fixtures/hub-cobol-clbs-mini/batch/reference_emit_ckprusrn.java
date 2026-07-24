// EXPECTED: 20
// Reference emit for CKPRUSRN — PROCEDURE USING + CALL TAKE path.
public final class CkprusrnRef {
  public static void main(String[] args) {
    String entry = "T";
    int phase = switch (entry) {
      case "I" -> 0;
      case "T" -> 20;
      case "C" -> 30;
      case "R" -> 40;
      default -> 99;
    };
    System.out.printf("%02d%n", phase);
  }
}
