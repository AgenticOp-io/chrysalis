// EXPECTED: 66
// Reference emit for PORTFLIODN — PORTFLIO COPY-linked type+status RC sum.
using System;
public static class PortfliodnRef {
  static int TypeRc(string t) {
    if (t == "I") return 10;
    if (t == "C") return 20;
    if (t == "T") return 30;
    return 99;
  }

  static int StatusRc(string s) {
    if (s == "A") return 1;
    if (s == "C") return 2;
    if (s == "S") return 3;
    return 99;
  }

  public static void Main() {
    int total = 0;
    foreach (var t in new[] { "I", "C", "T" }) total += TypeRc(t);
    foreach (var s in new[] { "A", "C", "S" }) total += StatusRc(s);
    Console.WriteLine(total);
  }
}
