// EXPECTED: 2
// Reference emit for NESTBR — nested IF grade bands.
using System;
public static class NestbrRef {
  public static void Main() {
    int score = 75;
    int grade;
    if (score >= 90) grade = 4;
    else if (score >= 80) grade = 3;
    else if (score >= 70) grade = 2;
    else grade = 1;
    Console.WriteLine(grade);
  }
}
