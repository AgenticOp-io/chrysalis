# hub-flagship-typescript

Twenty-route **Express** app written in **TypeScript** (typed `Request`/`Response`/`Express`), mirroring `hub-flagship-express`. Shares the JS/TS AST lift path but is a real `.ts` origin — not a rename of the JavaScript flagship (**D6447**).

## Prove

```bash
pnpm run hub:typescript-flagship
pnpm run hub:complete-conversion-prove:typescript
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`).
