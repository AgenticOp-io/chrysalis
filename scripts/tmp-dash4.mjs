import { convertAllOriginPieces } from "./lib/convert-origin-pieces.mjs";
const r = await convertAllOriginPieces({ onlyIds: ["ui:/dashboard"] });
console.log(JSON.stringify(r.results ?? r, null, 1).slice(0, 800));
