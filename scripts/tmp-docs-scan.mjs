import fs from "node:fs";
const p = "C:/Users/david/AgenticOps/products/wisptools/Module_Manager/src/lib/docs/";
for (const f of fs.readdirSync(p)) {
  const s = fs.readFileSync(p + f, "utf8");
  console.log(
    f,
    "len=" + s.length,
    "hasDollarBrace=" + s.includes("${"),
    "hasCloseScript=" + /<\/script/i.test(s),
    "exports=" + JSON.stringify([...s.matchAll(/export const (\w+)\s*=\s*(`|')/g)].map((m) => m[1] + ":" + m[2])),
  );
}
