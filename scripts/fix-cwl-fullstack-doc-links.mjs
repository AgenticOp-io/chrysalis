import { readFileSync, writeFileSync } from "node:fs";

const p = "ROADMAP-ARCHIVE.md";
let t = readFileSync(p, "utf8");
t = t.replace(/`docs\/CWL-FULLSTACK-NEXT-10-(\d+)\.md`/g, "`docs/archive/CWL-FULLSTACK-BUILD-LOG.md#queue-$1`");
t = t.replace(/`docs\/CWL-FULLSTACK-NEXT-10\.md`/g, "`docs/archive/CWL-FULLSTACK-BUILD-LOG.md#queue-1`");
t = t.replace(/`docs\/CWL-FULLSTACK-QUEUES-([^.]+)\.md`/g, (_, r) =>
  `\`docs/archive/CWL-FULLSTACK-BUILD-LOG.md#cwl-fullstack-queues-${r.toLowerCase()}\``,
);
t = t.replace(/docs\/CWL-FULLSTACK-NEXT-10-(\d+)\.md/g, "docs/archive/CWL-FULLSTACK-BUILD-LOG.md#queue-$1");
t = t.replace(/docs\/CWL-FULLSTACK-NEXT-10\.md/g, "docs/archive/CWL-FULLSTACK-BUILD-LOG.md#queue-1");
t = t.replace(/docs\/CWL-FULLSTACK-QUEUES-([^\s`)]+)\.md/g, (_, r) =>
  `docs/archive/CWL-FULLSTACK-BUILD-LOG.md#cwl-fullstack-queues-${r.toLowerCase()}`,
);
writeFileSync(p, t);
console.log("updated ROADMAP-ARCHIVE");
