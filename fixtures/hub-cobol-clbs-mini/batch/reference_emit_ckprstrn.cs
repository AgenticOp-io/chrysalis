// EXPECTED: 20
// Reference emit for CKPRSTRN (TAKE → phase 20).
using System;
public static class CkprstrnRef {
  public static void Main() {
    char entry = 'T';
    int phase = entry switch {
      'I' => 0,
      'T' => 20,
      'C' => 30,
      'R' => 40,
      _ => 99,
    };
    Console.WriteLine(phase.ToString("00"));
  }
}
