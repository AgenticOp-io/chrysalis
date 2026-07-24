// EXPECTED: 23.75
// Reference emit for RTNANARN — CLBS return-code analysis sequential weight sum.
public final class RtnanarnRef {
  public static void main(String[] args) {
    double[] weights = {1.25, 1.25, 1.25, 2.50, 2.50, 5.00, 10.00};
    double total = 0.0;
    for (double v : weights) total += v;
    System.out.printf("%.2f%n", total);
  }
}
