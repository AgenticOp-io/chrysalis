// EXPECTED: 85.75
// Reference emit for RPTAUDRN — CLBS audit-report sequential severity sum.
public final class RptaurnRef {
  public static void main(String[] args) {
    double[] audit = {20.00, 35.50, 15.25};
    double[] errors = {10.00, 5.00};
    double total = 0.0;
    for (double v : audit) total += v;
    for (double v : errors) total += v;
    System.out.printf("%.2f%n", total);
  }
}
