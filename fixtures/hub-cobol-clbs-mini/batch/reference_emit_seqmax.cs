// EXPECTED: 30.00
// Reference emit for SEQMAX — LINE SEQUENTIAL write/read max.
using System;
using System.Linq;
public static class SeqmaxRef {
  public static void Main() {
    double[] amounts = {10.50, 20.25, 5.00, 30.00};
    double max = amounts.Max();
    Console.WriteLine(max.ToString("0.00"));
  }
}
