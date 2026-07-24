// EXPECTED: 71.75
// Reference emit for RPTSTARN — CLBS stats-report sequential metrics sum.
public final class RptstarnRef {
  public static void main(String[] args) {
    double[] db2 = {12.50, 18.75, 9.00};
    double[] batch = {20.00, 11.50};
    double total = 0.0;
    for (double v : db2) total += v;
    for (double v : batch) total += v;
    System.out.printf("%.2f%n", total);
  }
}
