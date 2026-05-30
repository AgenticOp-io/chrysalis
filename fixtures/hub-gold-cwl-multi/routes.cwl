# Multi-file CWL gold fixture (G155 / RFC-0009)
module gold_multi;

import "health.cwl";
import "meta.cwl";

@route GET "/ping"
handler ping {
  effects: none;
  return 42;
}
