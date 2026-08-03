// EXPECTED: 1.25
// Reference emit for CBACT04RN — (1000.00 * 1.5) / 1200 rounded.
public final class Cbact04rnRef {
  public static void main(String[] args) {
    double bal = 1000.00;
    double rate = 1.5;
    double monthly = Math.round((bal * rate) / 1200.0 * 100.0) / 100.0;
    System.out.printf("%.2f%n", monthly);
  }
}
