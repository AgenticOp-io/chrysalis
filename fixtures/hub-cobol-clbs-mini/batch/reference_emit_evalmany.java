// EXPECTED: 25
// Reference emit for EVALMANY — multi-WHEN EVALUATE.
public final class EvalmanyRef {
  public static void main(String[] args) {
    int code = 2;
    int fee = switch (code) {
      case 1 -> 10;
      case 2 -> 25;
      case 3 -> 40;
      default -> 99;
    };
    System.out.println(fee);
  }
}
