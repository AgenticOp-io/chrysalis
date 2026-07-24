// EXPECTED: 446.50
public final class EmppayrnRef {
  public static void main(String[] args) {
    int hours = 19;
    double rate = 23.50;
    double ot = hours < 40 ? 0.0 : 0.25;
    double week = hours * rate * (1 + ot);
    System.out.printf("%.2f%n", week);
  }
}
