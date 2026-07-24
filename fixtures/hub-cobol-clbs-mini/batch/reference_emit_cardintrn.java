// EXPECTED: 29.00
// Reference emit contract for CARDINTRN (1000.00 * 0.0290 rounded).
public final class CardIntrnRef {
  public static void main(String[] args) {
    double bal = 1000.00;
    double rate = 0.0290;
    double fee = Math.round(bal * rate * 100.0) / 100.0;
    System.out.printf("%.2f%n", fee);
  }
}
