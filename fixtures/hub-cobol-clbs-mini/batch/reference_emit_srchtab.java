// EXPECTED: 350
// Reference emit for SRCHTAB — OCCURS + SEARCH keyed lookup.
public final class SrchtabRef {
  public static void main(String[] args) {
    java.util.Map<Integer, Integer> table = java.util.Map.of(10, 100, 20, 200, 30, 350, 40, 400);
    int find = 30;
    int result = table.getOrDefault(find, 0);
    System.out.println(result);
  }
}
