// EXPECTED: 35.75
// Reference emit contract for SEQSUM (LINE SEQUENTIAL write/read sum).
using System;
public static class SeqsumRef {
  public static void Main() {
    double total = 10.50 + 20.25 + 5.00;
    Console.WriteLine(total.ToString("0.00"));
  }
}
