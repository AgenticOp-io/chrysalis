// EXPECTED: 446.50
// Reference emit contract for EMPPAYRN (19h * 23.50, OT 0).
using System;
public static class EmppayrnRef {
  public static void Main() {
    int hours = 19;
    double rate = 23.50;
    double ot = hours < 40 ? 0.0 : 0.25;
    double week = hours * rate * (1 + ot);
    Console.WriteLine(week.ToString("0.00"));
  }
}
