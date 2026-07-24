// EXPECTED: 405.75
// Reference emit for RPTPOSRN — CLBS position-report sequential sum.
public final class RptposrnRef {
  public static void main(String[] args) {
    double[] values = {125.00, 200.50, 80.25};
    double total = 0.0;
    for (double v : values) total += v;
    System.out.printf("%.2f%n", total);
  }
}
