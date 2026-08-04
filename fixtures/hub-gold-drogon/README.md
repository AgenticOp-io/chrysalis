# hub-gold-drogon

Secondary **Drogon** C++ dialect gold (route-surface). Crow remains C++ D6448-ST; cpp-httplib stays green.

- Gate: **G10117** / **D6542**
- Smoke: `pnpm run hub:drogon-smoke`
- Peels: `app().registerHandler("/path", …, {Get|Post|…})` + `Json::Value` / `newHttpJsonResponse` / `setBody` / `setStatusCode(k*)` / `getParameter` / `{id}` lambda args
- Honest holes: `METHOD_ADD` / HttpController, filters/advice, bootstrap, non-literal paths — see `fixtures/ci/drogon-honest-skip.json` (`closed-route-surface`)
