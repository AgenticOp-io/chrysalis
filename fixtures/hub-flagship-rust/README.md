# hub-flagship-rust

Twenty-route **Actix Web** app mirroring `hub-flagship-express` / kotlin / scala / java (scalar + `serde_json::json!` + path/query + `HttpResponse` status). No invented product UI (**D6447**).

## Prove

```bash
pnpm run hub:rust-flagship
pnpm run hub:complete-conversion-prove:rust
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`).
