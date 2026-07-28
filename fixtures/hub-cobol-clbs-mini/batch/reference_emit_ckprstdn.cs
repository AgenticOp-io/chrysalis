// EXPECTED: 150
// Reference emit for CKPRSTDN — CKPRST COPY-linked status 88 RC sum.
using System;
public static class CkprstdnRef {
  static int StatusRc(string status) {
    if (status == "I") return 10;
    if (status == "A") return 20;
    if (status == "C") return 30;
    if (status == "F") return 40;
    if (status == "R") return 50;
    return 99;
  }

  public static void Main() {
    int total = 0;
    foreach (var s in new[] { "I", "A", "C", "F", "R" }) {
      total += StatusRc(s);
    }
    Console.WriteLine(total);
  }
}
