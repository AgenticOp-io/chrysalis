// EXPECTED: 30.00
// Reference emit for SEQMAX — LINE SEQUENTIAL write/read max.
public final class SeqmaxRef {
  public static void main(String[] args) {
    double[] amounts = {10.50, 20.25, 5.00, 30.00};
    double max = 0.0;
    for (double a : amounts) if (a > max) max = a;
    System.out.printf("%.2f%n", max);
  }
}
