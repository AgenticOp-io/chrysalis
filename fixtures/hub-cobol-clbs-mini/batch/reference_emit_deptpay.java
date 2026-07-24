// EXPECTED: 5847.95
public final class DeptpayRef {
  public static void main(String[] args) {
    double total = 111111.11;
    int n = 19;
    double avg = Math.floor(total / n * 100.0) / 100.0;
    System.out.printf("%.2f%n", avg);
  }
}
