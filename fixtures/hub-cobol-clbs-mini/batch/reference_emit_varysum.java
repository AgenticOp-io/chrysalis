// EXPECTED: 55
// Reference emit for VARYSUM — PERFORM VARYING 1..10 sum.
public final class VarysumRef {
  public static void main(String[] args) {
    int total = 0;
    for (int i = 1; i <= 10; i++) total += i;
    System.out.println(total);
  }
}
