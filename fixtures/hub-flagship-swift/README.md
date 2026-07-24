# hub-flagship-swift

Twenty-route **Vapor** app mirroring `hub-flagship-express` / kotlin / java / go (scalar + dict JSON + path/query + `encodeResponse` status). Path registration uses multi-segment PathComponents (`app.get("items", ":id")`). No invented product UI (**D6447**).

## Prove

```bash
pnpm run hub:swift-flagship
pnpm run hub:complete-conversion-prove:swift
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`).
