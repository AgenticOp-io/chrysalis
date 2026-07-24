// EXPECTED: 52.50
// Reference emit contract for CLBSMATH (1000.00 * 0.0525 rounded).
public final class ClbsMathRef {
  public static void main(String[] args) {
    double amount = 1000.00;
    double rate = 0.0525;
    double result = Math.round(amount * rate * 100.0) / 100.0;
    System.out.printf("%.2f%n", result);
  }
}
