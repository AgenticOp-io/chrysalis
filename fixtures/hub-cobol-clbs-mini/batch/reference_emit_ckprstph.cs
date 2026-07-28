// EXPECTED: 100
// Reference emit for CKPRSTPH — CKPRST COPY-linked phase 88 RC sum.
using System;
public static class CkprstphRef {
  static int PhaseRc(string p) {
    if (p == "00") return 0;
    if (p == "10") return 10;
    if (p == "20") return 20;
    if (p == "30") return 30;
    if (p == "40") return 40;
    return 99;
  }

  public static void Main() {
    int total = 0;
    foreach (var p in new[] { "00", "10", "20", "30", "40" }) {
      total += PhaseRc(p);
    }
    Console.WriteLine(total);
  }
}
