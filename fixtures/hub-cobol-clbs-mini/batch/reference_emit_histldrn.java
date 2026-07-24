// EXPECTED: 45.75
// Reference emit for HISTLDRN — CLBS history-load sequential sum.
public final class HistldrnRef {
  public static void main(String[] args) {
    double[] amounts = {12.50, 25.00, 8.25};
    double total = 0.0;
    for (double a : amounts) total += a;
    System.out.printf("%.2f%n", total);
  }
}
