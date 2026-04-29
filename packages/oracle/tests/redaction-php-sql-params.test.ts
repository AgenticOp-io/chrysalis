import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../oracle-php/tests/redactor_sql_params_test.php", import.meta.url));

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const describePhp = phpOnPath() ? describe : describe.skip;

describePhp("oracle-php Redactor sql.params (subprocess)", () => {
  it("redacts bound params by driver + SQL prefix + index", () => {
    const out = execSync(`php "${script}"`, { encoding: "utf8" }).trim();
    expect(out).toBe("ok");
  });
});
