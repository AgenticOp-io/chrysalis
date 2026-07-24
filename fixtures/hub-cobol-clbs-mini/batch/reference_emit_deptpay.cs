// EXPECTED: 5847.95
using System;
public static class DeptpayRef {
  public static void Main() {
    double total = 111111.11;
    int n = 19;
    double avg = Math.Floor(total / n * 100.0) / 100.0;
    Console.WriteLine(avg.ToString("0.00"));
  }
}
