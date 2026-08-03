// EXPECTED: 155.00
// Reference emit for BANKWDRWRN — 200 - 45 remaining.
public final class BankWdrwrnRef {
  public static void main(String[] args) {
    double bal = 200.00;
    double wdrw = 45.00;
    double remain = wdrw <= bal ? Math.round((bal - wdrw) * 100.0) / 100.0 : bal;
    System.out.printf("%.2f%n", remain);
  }
}
