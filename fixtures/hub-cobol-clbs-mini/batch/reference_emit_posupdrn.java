// EXPECTED: 78.25
// Reference emit for POSUPDRN — CLBS POSUPDT-shaped position update sum.
public final class PosupdrnRef {
  public static void main(String[] args) {
    double[] amounts = {30.00, 25.50, 22.75};
    double total = 0;
    for (double a : amounts) total += a;
    System.out.printf("%.2f%n", total);
  }
}
