import fs from "node:fs";
const s = fs.readFileSync("fixtures/hub-wisp-management/routes.cwl", "utf8");
const re = /@page\s+GET\s+"([^"]*inventory[^"]*)"/g;
let m;
while ((m = re.exec(s))) console.log(m[1]);
