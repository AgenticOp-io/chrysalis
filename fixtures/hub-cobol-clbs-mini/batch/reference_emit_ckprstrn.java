// EXPECTED: 20
// Reference emit for CKPRSTRN (TAKE → phase 20).
public final class CkprstrnRef {
  public static void main(String[] args) {
    char entry = 'T';
    int phase = switch (entry) {
      case 'I' -> 0;
      case 'T' -> 20;
      case 'C' -> 30;
      case 'R' -> 40;
      default -> 99;
    };
    System.out.printf("%02d%n", phase);
  }
}
