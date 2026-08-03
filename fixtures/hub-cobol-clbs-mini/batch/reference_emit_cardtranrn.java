// EXPECTED: 2.50
// Reference emit for CARDTRANRN — type 01 fee 100 * 0.025.
public final class CardTranrnRef {
  public static void main(String[] args) {
    String type = "01";
    double amt = 100.00;
    double rate = 0.0250;
    double fee;
    if ("01".equals(type)) {
      fee = Math.round(amt * rate * 100.0) / 100.0;
    } else if ("02".equals(type)) {
      fee = Math.round(amt * rate * 0.5 * 100.0) / 100.0;
    } else {
      fee = 0.0;
    }
    System.out.printf("%.2f%n", fee);
  }
}
