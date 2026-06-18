import { fail, readJsonGateArtifact } from "./ci-gates-shared.mjs";

/** GCE fast path defers duplicate smokes (DESIGN D2269); ok:true + skip is acceptable in ci-gates. */
function isGceHubCompletionDeferred(entry) {
  return entry?.skip === "gce-deferred-hub-completion-fast";
}

function assertHubCompletion(path) {
  const label = "hub-completion";
  const s = readJsonGateArtifact(label, path, {
    missingLabel: "report file missing",
    missingHint: ["Run: pnpm run ci:hub-completion"],
  });
  if (s.kind !== "chrysalis.hub.completion") {
    fail(`${label}: expected kind chrysalis.hub.completion, got ${JSON.stringify(s.kind)}`);
  }
  if (
    s.schemaVersion !== 0 &&
    s.schemaVersion !== 1 &&
    s.schemaVersion !== 2 &&
    s.schemaVersion !== 3 &&
    s.schemaVersion !== 4 &&
    s.schemaVersion !== 5 &&
    s.schemaVersion !== 6 &&
    s.schemaVersion !== 7 &&
    s.schemaVersion !== 8 &&
    s.schemaVersion !== 9 &&
    s.schemaVersion !== 10 &&
    s.schemaVersion !== 11 &&
    s.schemaVersion !== 12 &&
    s.schemaVersion !== 13 &&
    s.schemaVersion !== 14 &&
    s.schemaVersion !== 15 &&
    s.schemaVersion !== 16 &&
    s.schemaVersion !== 17 &&
    s.schemaVersion !== 18 &&
    s.schemaVersion !== 19 &&
    s.schemaVersion !== 20 &&
    s.schemaVersion !== 22 &&
    s.schemaVersion !== 23 &&
    s.schemaVersion !== 24 &&
    s.schemaVersion !== 25 &&
    s.schemaVersion !== 26 &&
    s.schemaVersion !== 27 &&
    s.schemaVersion !== 28 &&
    s.schemaVersion !== 29 &&
    s.schemaVersion !== 30 &&
    s.schemaVersion !== 31 &&
    s.schemaVersion !== 32 &&
    s.schemaVersion !== 33 &&
    s.schemaVersion !== 34 &&
    s.schemaVersion !== 35 &&
    s.schemaVersion !== 36 &&
    s.schemaVersion !== 37 &&
    s.schemaVersion !== 38 &&
    s.schemaVersion !== 39 &&
    s.schemaVersion !== 40 &&
    s.schemaVersion !== 41 &&
    s.schemaVersion !== 42 &&
    s.schemaVersion !== 43 &&
    s.schemaVersion !== 44 &&
    s.schemaVersion !== 45 &&
    s.schemaVersion !== 46 &&
    s.schemaVersion !== 47 &&
    s.schemaVersion !== 48 &&
    s.schemaVersion !== 49 &&
    s.schemaVersion !== 50 &&
    s.schemaVersion !== 51 &&
    s.schemaVersion !== 52 &&
    s.schemaVersion !== 53 &&
    s.schemaVersion !== 54 &&
    s.schemaVersion !== 55 &&
    s.schemaVersion !== 56 &&
    s.schemaVersion !== 57 &&
    s.schemaVersion !== 58 &&
    s.schemaVersion !== 59 &&
    s.schemaVersion !== 60 &&
    s.schemaVersion !== 61 &&
    s.schemaVersion !== 62 &&
    s.schemaVersion !== 63 &&
    s.schemaVersion !== 64 &&
    s.schemaVersion !== 65 &&
    s.schemaVersion !== 66 &&
    s.schemaVersion !== 67 &&
    s.schemaVersion !== 68 &&
    s.schemaVersion !== 69 &&
    s.schemaVersion !== 70 &&
    s.schemaVersion !== 71 &&
    s.schemaVersion !== 72 &&
    s.schemaVersion !== 73 &&
    s.schemaVersion !== 74 &&
    s.schemaVersion !== 133 &&
    s.schemaVersion !== 134 &&
    s.schemaVersion !== 135 &&
    s.schemaVersion !== 136 &&
    s.schemaVersion !== 137 &&
    s.schemaVersion !== 138 &&
    s.schemaVersion !== 139 &&
    s.schemaVersion !== 140 &&
    s.schemaVersion !== 141 &&
    s.schemaVersion !== 142 &&
    s.schemaVersion !== 143 &&
    s.schemaVersion !== 144 &&
    s.schemaVersion !== 145 &&
    s.schemaVersion !== 146 &&
    s.schemaVersion !== 147 &&
    s.schemaVersion !== 148 &&
    s.schemaVersion !== 149 &&
    s.schemaVersion !== 150 &&
    s.schemaVersion !== 151 &&
    s.schemaVersion !== 152 &&
    s.schemaVersion !== 153 &&
    s.schemaVersion !== 154 &&
    s.schemaVersion !== 155 &&
    s.schemaVersion !== 156 &&
    s.schemaVersion !== 157 &&
    s.schemaVersion !== 158 &&
    s.schemaVersion !== 159 &&
    s.schemaVersion !== 160 &&
    s.schemaVersion !== 161 &&
    s.schemaVersion !== 162 &&
    s.schemaVersion !== 163 &&
    s.schemaVersion !== 164 &&
    s.schemaVersion !== 165 &&
    s.schemaVersion !== 166 &&
    s.schemaVersion !== 167 &&
    s.schemaVersion !== 168 &&
    s.schemaVersion !== 169 &&
    s.schemaVersion !== 170 &&
    s.schemaVersion !== 171 &&
    s.schemaVersion !== 172 &&
    s.schemaVersion !== 173 &&
    s.schemaVersion !== 174 &&
    s.schemaVersion !== 175 &&
    s.schemaVersion !== 176 &&
    s.schemaVersion !== 177 &&
    s.schemaVersion !== 178 &&
    s.schemaVersion !== 179 &&
    s.schemaVersion !== 180 &&
    s.schemaVersion !== 181 &&
    s.schemaVersion !== 182 &&
    s.schemaVersion !== 183 &&
    s.schemaVersion !== 184 &&
    s.schemaVersion !== 185 &&
    s.schemaVersion !== 186 &&
    s.schemaVersion !== 187 &&
    s.schemaVersion !== 188 &&
    s.schemaVersion !== 189 &&
    s.schemaVersion !== 190 &&
    s.schemaVersion !== 191 &&
    s.schemaVersion !== 192 &&
    s.schemaVersion !== 193 &&
    s.schemaVersion !== 194 &&
    s.schemaVersion !== 195 &&
    s.schemaVersion !== 196 &&
    s.schemaVersion !== 197 &&
    s.schemaVersion !== 198 &&
    s.schemaVersion !== 199 &&
    s.schemaVersion !== 200 &&
    s.schemaVersion !== 201 &&
    s.schemaVersion !== 202 &&
    s.schemaVersion !== 203 &&
    s.schemaVersion !== 204 &&
    s.schemaVersion !== 205 &&
    s.schemaVersion !== 206 &&
    s.schemaVersion !== 207 &&
    s.schemaVersion !== 208 &&
    s.schemaVersion !== 209 &&
    s.schemaVersion !== 210 &&
    s.schemaVersion !== 211 &&
    s.schemaVersion !== 212 &&
    s.schemaVersion !== 213 &&
    s.schemaVersion !== 214 &&
    s.schemaVersion !== 215 &&
    s.schemaVersion !== 216 &&
    s.schemaVersion !== 217 &&
    s.schemaVersion !== 218 &&
    s.schemaVersion !== 219 &&
    s.schemaVersion !== 220 &&
    s.schemaVersion !== 221 &&
    s.schemaVersion !== 222 &&
    s.schemaVersion !== 223 &&
    s.schemaVersion !== 224 &&
    s.schemaVersion !== 225 &&
    s.schemaVersion !== 226 &&
    s.schemaVersion !== 227 &&
    s.schemaVersion !== 228 &&
    s.schemaVersion !== 229 &&
    s.schemaVersion !== 230 &&
    s.schemaVersion !== 231 &&
    s.schemaVersion !== 232 &&
    s.schemaVersion !== 233 &&
    s.schemaVersion !== 234 &&
    s.schemaVersion !== 235 &&
    s.schemaVersion !== 236 &&
    s.schemaVersion !== 237 &&
    s.schemaVersion !== 238 &&
    s.schemaVersion !== 239 &&
    s.schemaVersion !== 240 &&
    s.schemaVersion !== 241 &&
    s.schemaVersion !== 242 &&
    s.schemaVersion !== 243 &&
    s.schemaVersion !== 244 &&
    s.schemaVersion !== 245 &&
    s.schemaVersion !== 246 &&
    s.schemaVersion !== 247 &&
    s.schemaVersion !== 248 &&
    s.schemaVersion !== 249 &&
    s.schemaVersion !== 250 &&
    s.schemaVersion !== 251 &&
    s.schemaVersion !== 252 &&
    s.schemaVersion !== 253 &&
    s.schemaVersion !== 254 &&
    s.schemaVersion !== 255 &&
    s.schemaVersion !== 256 &&
    s.schemaVersion !== 257 &&
    s.schemaVersion !== 258 &&
    s.schemaVersion !== 259 &&
    s.schemaVersion !== 260 &&
    s.schemaVersion !== 261 &&
    s.schemaVersion !== 262 &&
    s.schemaVersion !== 263 &&
    s.schemaVersion !== 264 &&
    s.schemaVersion !== 265 &&
    s.schemaVersion !== 266 &&
    s.schemaVersion !== 267 &&
    s.schemaVersion !== 268 &&
    s.schemaVersion !== 269 &&
    s.schemaVersion !== 270 &&
    s.schemaVersion !== 271 &&
    s.schemaVersion !== 272 &&
    s.schemaVersion !== 273 &&
    s.schemaVersion !== 274 &&
    s.schemaVersion !== 275 &&
    s.schemaVersion !== 276 &&
    s.schemaVersion !== 277 &&
    s.schemaVersion !== 278 &&
    s.schemaVersion !== 279 &&
    s.schemaVersion !== 280 &&
    s.schemaVersion !== 281 &&
    s.schemaVersion !== 282 &&
    s.schemaVersion !== 283 &&
    s.schemaVersion !== 284 &&
    s.schemaVersion !== 285 &&
    s.schemaVersion !== 286 &&
    s.schemaVersion !== 287 &&
    s.schemaVersion !== 288 &&
    s.schemaVersion !== 289 &&
    s.schemaVersion !== 290 &&
    s.schemaVersion !== 291 &&
    s.schemaVersion !== 292 &&
    s.schemaVersion !== 293 &&
    s.schemaVersion !== 294 &&
    s.schemaVersion !== 295 &&
    s.schemaVersion !== 296 &&
    s.schemaVersion !== 297 &&
    s.schemaVersion !== 298 &&
    s.schemaVersion !== 299 &&
    s.schemaVersion !== 300 &&
    s.schemaVersion !== 301 &&
    s.schemaVersion !== 302 &&
    s.schemaVersion !== 303 &&
    s.schemaVersion !== 304 &&
    s.schemaVersion !== 305 &&
    s.schemaVersion !== 306 &&
    s.schemaVersion !== 307 &&
    s.schemaVersion !== 308 &&
    s.schemaVersion !== 309 &&
    s.schemaVersion !== 310 &&
    s.schemaVersion !== 311 &&
    s.schemaVersion !== 312 &&
    s.schemaVersion !== 313 &&
    s.schemaVersion !== 314 &&
    s.schemaVersion !== 315 &&
    s.schemaVersion !== 316 &&
    s.schemaVersion !== 317 &&
    s.schemaVersion !== 318 &&
    s.schemaVersion !== 319 &&
    s.schemaVersion !== 320 &&
    s.schemaVersion !== 321 &&
    s.schemaVersion !== 322 &&
    s.schemaVersion !== 323 &&
    s.schemaVersion !== 324 &&
    s.schemaVersion !== 325 &&
    s.schemaVersion !== 326 &&
    s.schemaVersion !== 327 &&
    s.schemaVersion !== 328 &&
    s.schemaVersion !== 329 &&
    s.schemaVersion !== 330 &&
    s.schemaVersion !== 331 &&
    s.schemaVersion !== 332 &&
    s.schemaVersion !== 333 &&
    s.schemaVersion !== 334 &&
    s.schemaVersion !== 335 &&
    s.schemaVersion !== 336 &&
    s.schemaVersion !== 337 &&
    s.schemaVersion !== 338 &&
    s.schemaVersion !== 339 &&
    s.schemaVersion !== 340 &&
    s.schemaVersion !== 341 &&
    s.schemaVersion !== 342 &&
    s.schemaVersion !== 343 &&
    s.schemaVersion !== 344 &&
    s.schemaVersion !== 345 &&
    s.schemaVersion !== 346 &&
    s.schemaVersion !== 347 &&
    s.schemaVersion !== 348 &&
    s.schemaVersion !== 349 &&
    s.schemaVersion !== 350 &&
    s.schemaVersion !== 351 &&
    s.schemaVersion !== 352 &&
    s.schemaVersion !== 353 &&
    s.schemaVersion !== 354 &&
    s.schemaVersion !== 355 &&
    s.schemaVersion !== 356 &&
    s.schemaVersion !== 357 &&
    s.schemaVersion !== 358 &&
    s.schemaVersion !== 359 &&
    s.schemaVersion !== 360 &&
    s.schemaVersion !== 361 &&
    s.schemaVersion !== 362 &&
    s.schemaVersion !== 363 &&
    s.schemaVersion !== 364 &&
    s.schemaVersion !== 365 &&
    s.schemaVersion !== 366 &&
    s.schemaVersion !== 367 &&
    s.schemaVersion !== 368 &&
    s.schemaVersion !== 369 &&
    s.schemaVersion !== 370 &&
    s.schemaVersion !== 371 &&
    s.schemaVersion !== 372 &&
    s.schemaVersion !== 373 &&
    s.schemaVersion !== 374 &&
    s.schemaVersion !== 375 &&
    s.schemaVersion !== 376 &&
    s.schemaVersion !== 377 &&
    s.schemaVersion !== 378 &&
    s.schemaVersion !== 379 &&
    s.schemaVersion !== 380 &&
    s.schemaVersion !== 381 &&
    s.schemaVersion !== 382 &&
    s.schemaVersion !== 383 &&
    s.schemaVersion !== 384 &&
    s.schemaVersion !== 385 &&
    s.schemaVersion !== 386 &&
    s.schemaVersion !== 387 &&
    s.schemaVersion !== 388 &&
    s.schemaVersion !== 389 &&
    s.schemaVersion !== 390 &&
    s.schemaVersion !== 391 &&
    s.schemaVersion !== 392 &&
    s.schemaVersion !== 393 &&
    s.schemaVersion !== 394 &&
    s.schemaVersion !== 395 &&
    s.schemaVersion !== 396 &&
    s.schemaVersion !== 397 &&
    s.schemaVersion !== 398 &&
    s.schemaVersion !== 399 &&
    s.schemaVersion !== 400 &&
    s.schemaVersion !== 401 &&
    s.schemaVersion !== 402 &&
    s.schemaVersion !== 403 &&
    s.schemaVersion !== 404 &&
    s.schemaVersion !== 405 &&
    s.schemaVersion !== 406 &&
    s.schemaVersion !== 407 &&
    s.schemaVersion !== 408 &&
    s.schemaVersion !== 409 &&
    s.schemaVersion !== 410 &&
    s.schemaVersion !== 411 &&
    s.schemaVersion !== 412 &&
    s.schemaVersion !== 413 &&
    s.schemaVersion !== 414 &&
    s.schemaVersion !== 415 &&
    s.schemaVersion !== 416 &&
    s.schemaVersion !== 417 &&
    s.schemaVersion !== 418 &&
    s.schemaVersion !== 419 &&
    s.schemaVersion !== 420 &&
    s.schemaVersion !== 421 &&
    s.schemaVersion !== 422 &&
    s.schemaVersion !== 423 &&
    s.schemaVersion !== 424 &&
    s.schemaVersion !== 425 &&
    s.schemaVersion !== 426 &&
    s.schemaVersion !== 427 &&
    s.schemaVersion !== 428 &&
    s.schemaVersion !== 429 &&
    s.schemaVersion !== 430 &&
    s.schemaVersion !== 431 &&
    s.schemaVersion !== 432 &&
    s.schemaVersion !== 433 &&
    s.schemaVersion !== 434 &&
    s.schemaVersion !== 435 &&
    s.schemaVersion !== 436 &&
    s.schemaVersion !== 437 &&
    s.schemaVersion !== 438 &&
    s.schemaVersion !== 439 &&
    s.schemaVersion !== 440 &&
    s.schemaVersion !== 441 &&
    s.schemaVersion !== 442 &&
    s.schemaVersion !== 443 &&
    s.schemaVersion !== 444 &&
    s.schemaVersion !== 445 &&
    s.schemaVersion !== 446 &&
    s.schemaVersion !== 447 &&
    s.schemaVersion !== 448 &&
    s.schemaVersion !== 449 &&
    s.schemaVersion !== 450 &&
    s.schemaVersion !== 451 &&
    s.schemaVersion !== 452 &&
    s.schemaVersion !== 453 &&
    s.schemaVersion !== 454 &&
    s.schemaVersion !== 455 &&
    s.schemaVersion !== 456 &&
    s.schemaVersion !== 457 &&
    s.schemaVersion !== 458 &&
    s.schemaVersion !== 459 &&
    s.schemaVersion !== 460 &&
    s.schemaVersion !== 461 &&
    s.schemaVersion !== 462 &&
    s.schemaVersion !== 463 &&
    s.schemaVersion !== 464 &&
    s.schemaVersion !== 465 &&
    s.schemaVersion !== 466 &&
    s.schemaVersion !== 467 &&
    s.schemaVersion !== 468 &&
    s.schemaVersion !== 469 &&
    s.schemaVersion !== 470 &&
    s.schemaVersion !== 471 &&
    s.schemaVersion !== 472 &&
    s.schemaVersion !== 473 &&
    s.schemaVersion !== 474 &&
    s.schemaVersion !== 475 &&
    s.schemaVersion !== 476 &&
    s.schemaVersion !== 477 &&
    s.schemaVersion !== 478 &&
    s.schemaVersion !== 479 &&
    s.schemaVersion !== 480 &&
    s.schemaVersion !== 481 &&
    s.schemaVersion !== 482 &&
    s.schemaVersion !== 483 &&
    s.schemaVersion !== 484 &&
    s.schemaVersion !== 485 &&
    s.schemaVersion !== 486 &&
    s.schemaVersion !== 487 &&
    s.schemaVersion !== 488 &&
    s.schemaVersion !== 489 &&
    s.schemaVersion !== 490 &&
    s.schemaVersion !== 491 &&
    s.schemaVersion !== 492 &&
    s.schemaVersion !== 493 &&
    s.schemaVersion !== 494 &&
    s.schemaVersion !== 495 &&
    s.schemaVersion !== 496 &&
    s.schemaVersion !== 497 &&
    s.schemaVersion !== 498 &&
    s.schemaVersion !== 499 &&
    s.schemaVersion !== 500 &&
    s.schemaVersion !== 501 &&
    s.schemaVersion !== 502 &&
    s.schemaVersion !== 503 &&
    s.schemaVersion !== 504 &&
    s.schemaVersion !== 505 &&
    s.schemaVersion !== 506 &&
    s.schemaVersion !== 507 &&
    s.schemaVersion !== 508 &&
    s.schemaVersion !== 509 &&
    s.schemaVersion !== 510 &&
    s.schemaVersion !== 511 &&
    s.schemaVersion !== 512
  ) {
    fail(`${label}: expected schemaVersion 0–74 or 133–512, got ${JSON.stringify(s.schemaVersion)}`);
  }
  if (s.ok !== true) {
    fail(`${label}: ok must be true (matrix failed=${s.matrixSmoke?.failed}, gold=${s.goldVerify?.ok})`);
  }
  if ((s.matrixSmoke?.failed ?? 1) !== 0) {
    fail(`${label}: matrixSmoke.failed must be 0, got ${JSON.stringify(s.matrixSmoke?.failed)}`);
  }
  if (s.goldVerify?.ok !== true) {
    fail(`${label}: goldVerify.ok must be true`);
  }
  if (s.schemaVersion >= 6) {
    const gExp = s.goldVerify?.expectedSuiteCount;
    const gCnt = s.goldVerify?.suiteCount;
    if (typeof gExp === "number" && typeof gCnt === "number" && gExp !== gCnt) {
      fail(`${label}: goldVerify.suiteCount ${gCnt} != expectedSuiteCount ${gExp}`);
    }
    const tExp = s.traceReplay?.expectedSuiteCount;
    const tCnt = s.traceReplay?.suiteCount;
    if (typeof tExp === "number" && typeof tCnt === "number" && tExp !== tCnt) {
      fail(`${label}: traceReplay.suiteCount ${tCnt} != expectedSuiteCount ${tExp}`);
    }
  }
  if (s.schemaVersion >= 1 && s.traceReplay?.ok !== true) {
    fail(`${label}: traceReplay.ok must be true (correctness=${s.traceReplay?.correctness})`);
  }
  if (s.schemaVersion >= 2 && s.nativeEmitSmoke?.ok !== true) {
    fail(`${label}: nativeEmitSmoke.ok must be true (failed=${s.nativeEmitSmoke?.failed})`);
  }
  if (s.schemaVersion >= 3 && s.crossLanguageSynthesis?.ok !== true) {
    fail(
      `${label}: crossLanguageSynthesis.ok must be true (pairCount=${s.crossLanguageSynthesis?.pairCount})`,
    );
  }
  if (s.schemaVersion >= 7 && s.goldCoverage?.ok !== true) {
    fail(`${label}: goldCoverage.ok must be true (gaps=${s.goldCoverage?.coverageGaps})`);
  }
  if (s.schemaVersion >= 8) {
    if (typeof s.goldCoverage?.oracleTier !== "number") {
      fail(`${label}: goldCoverage.oracleTier required for schema v8`);
    }
    if (typeof s.goldCoverage?.structuralTier !== "number") {
      fail(`${label}: goldCoverage.structuralTier required for schema v8`);
    }
  }
  if (s.schemaVersion >= 9) {
    const native = s.nativeStructuralGold;
    if (!native?.targets?.length || !native?.suiteIds?.length) {
      fail(`${label}: nativeStructuralGold.targets and suiteIds required for schema v9`);
    }
  }
  if (s.schemaVersion >= 10) {
    if (s.middlewareTraceReplay?.jsonPostProbe !== true) {
      fail(`${label}: middlewareTraceReplay.jsonPostProbe must be true for schema v10`);
    }
  }
  if (s.schemaVersion >= 11) {
    const mw = s.middlewareTraceReplay?.suites ?? [];
    if (!mw.includes("python-middleware-hono") || !mw.includes("python-middleware-fastify")) {
      fail(`${label}: middlewareTraceReplay must list python middleware suites for schema v11`);
    }
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("ruby-literal-hono") || !xf.includes("ruby-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list ruby hono/fastify for schema v11`);
    }
  }
  if (s.schemaVersion >= 12) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("java-literal-hono") || !xf.includes("java-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list java hono/fastify for schema v12`);
    }
  }
  if (s.schemaVersion >= 13) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    for (const id of [
      "go-literal-hono",
      "go-literal-fastify",
      "csharp-literal-hono",
      "csharp-literal-fastify",
    ]) {
      if (!xf.includes(id)) {
        fail(`${label}: crossFrameworkStructuralGold must list ${id} for schema v13`);
      }
    }
    const cwl = s.middlewareCwlGold?.suiteIds ?? [];
    if (!cwl.includes("python-middleware-cwl")) {
      fail(`${label}: middlewareCwlGold must list python-middleware-cwl for schema v13`);
    }
  }
  if (s.schemaVersion >= 14) {
    const cwl = s.crossFrameworkCwlGold?.suiteIds ?? [];
    for (const id of ["java-literal-cwl", "go-literal-cwl", "csharp-literal-cwl", "ruby-literal-cwl"]) {
      if (!cwl.includes(id)) {
        fail(`${label}: crossFrameworkCwlGold must list ${id} for schema v14`);
      }
    }
  }
  if (s.schemaVersion >= 15) {
    const kss = s.kssFrameworkGold?.suiteIds ?? [];
    for (const id of [
      "kotlin-literal-hono",
      "kotlin-literal-fastify",
      "kotlin-literal-cwl",
      "scala-literal-hono",
      "scala-literal-fastify",
      "scala-literal-cwl",
      "swift-literal-hono",
      "swift-literal-fastify",
      "swift-literal-cwl",
    ]) {
      if (!kss.includes(id)) {
        fail(`${label}: kssFrameworkGold must list ${id} for schema v15`);
      }
    }
  }
  if (s.schemaVersion >= 16) {
    const xf = s.crossFrameworkStructuralGold?.suiteIds ?? [];
    if (!xf.includes("rust-literal-hono") || !xf.includes("rust-literal-fastify")) {
      fail(`${label}: crossFrameworkStructuralGold must list rust hono/fastify for schema v16`);
    }
    const cwl = s.crossFrameworkCwlGold?.suiteIds ?? [];
    if (!cwl.includes("rust-literal-cwl")) {
      fail(`${label}: crossFrameworkCwlGold must list rust-literal-cwl for schema v16`);
    }
  }
  if (s.schemaVersion >= 17) {
    const next = s.typescriptFamilyNextjsGold?.suiteIds ?? [];
    for (const id of ["js-literal-nextjs", "ts-literal-nextjs"]) {
      if (!next.includes(id)) {
        fail(`${label}: typescriptFamilyNextjsGold must list ${id} for schema v17`);
      }
    }
  }
  if (s.schemaVersion >= 18) {
    const next = s.typescriptFamilyNextjsGold?.suiteIds ?? [];
    for (const id of ["js-structured-nextjs", "ts-structured-nextjs"]) {
      if (!next.includes(id)) {
        fail(`${label}: typescriptFamilyNextjsGold must list ${id} for schema v18`);
      }
    }
    const njs = s.nextjsTraceReplay?.suites ?? [];
    if (!njs.includes("js-literal-nextjs") || !njs.includes("ts-structured-nextjs")) {
      fail(`${label}: nextjsTraceReplay must list literal and structured nextjs suites for schema v18`);
    }
    const wptp = s.wptpContractGold?.suiteIds ?? [];
    if (!wptp.includes("contract-first-hono") || !wptp.includes("contract-first-nextjs")) {
      fail(`${label}: wptpContractGold must list contract-first hono and nextjs for schema v18`);
    }
    if (s.multiLaneSmoke?.ok !== true) {
      fail(`${label}: multiLaneSmoke.ok must be true for schema v18`);
    }
  }
  if (s.schemaVersion >= 19) {
    const mw = s.middlewareNextjsGold?.suiteIds ?? [];
    if (!mw.includes("js-middleware-nextjs") || !mw.includes("python-middleware-nextjs")) {
      fail(`${label}: middlewareNextjsGold must list js and python middleware nextjs for schema v19`);
    }
    if (!(s.cwlNextjsGold?.suiteIds ?? []).includes("cwl-gold-nextjs")) {
      fail(`${label}: cwlNextjsGold must list cwl-gold-nextjs for schema v19`);
    }
    const py = s.pythonNextjsGold?.suiteIds ?? [];
    if (!py.includes("python-literal-nextjs")) {
      fail(`${label}: pythonNextjsGold must list python-literal-nextjs for schema v19`);
    }
    const wptpTr = s.wptpContractGold?.traceReplaySuiteIds ?? [];
    if (!wptpTr.includes("contract-first-nextjs")) {
      fail(`${label}: wptpContractGold.traceReplaySuiteIds must list contract-first-nextjs for schema v19`);
    }
  }
  if (s.schemaVersion >= 20) {
    const xf = s.crossFrameworkNextjsGold?.suiteIds ?? [];
    for (const id of [
      "ruby-literal-nextjs",
      "java-literal-nextjs",
      "go-literal-nextjs",
      "csharp-literal-nextjs",
      "kotlin-literal-nextjs",
      "scala-literal-nextjs",
      "swift-literal-nextjs",
      "rust-literal-nextjs",
    ]) {
      if (!xf.includes(id)) {
        fail(`${label}: crossFrameworkNextjsGold must list ${id} for schema v20`);
      }
    }
    if (s.multiLaneSmoke?.parserBridgeVendor !== true) {
      fail(`${label}: multiLaneSmoke.parserBridgeVendor must be true for schema v20`);
    }
  }
  if (s.schemaVersion >= 21) {
    const asset = s.assetVueNextjsGold?.suiteIds ?? [];
    for (const id of ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"]) {
      if (!asset.includes(id)) {
        fail(`${label}: assetVueNextjsGold must list ${id} for schema v21`);
      }
    }
    if (s.multiLaneSmoke?.migrationDebtOk !== true) {
      fail(`${label}: multiLaneSmoke.migrationDebtOk must be true for schema v21`);
    }
  }
  if (s.schemaVersion >= 22) {
    const ext = s.assetExtendedNextjsGold?.suiteIds ?? [];
    for (const id of [
      "css-literal-nextjs",
      "scss-literal-nextjs",
      "markdown-literal-nextjs",
      "yaml-literal-nextjs",
      "c-literal-nextjs",
      "cpp-literal-nextjs",
    ]) {
      if (!ext.includes(id)) {
        fail(`${label}: assetExtendedNextjsGold must list ${id} for schema v22`);
      }
    }
    if (s.phpOracleSmoke?.ok !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.ok must be true (or skipped) for schema v22`);
    }
  }
  if (s.schemaVersion >= 23) {
    if (s.phpOracleSmoke?.ingestOk !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.ingestOk must be true for schema v23 when not skipped`);
    }
    if (!s.languageCompareApi) {
      fail(`${label}: languageCompareApi must be set for schema v23`);
    }
  }
  if (s.schemaVersion === 23) {
    if (s.pathKnowledgeV2?.schemaVersion !== 2) {
      fail(`${label}: pathKnowledgeV2.schemaVersion must be 2 for schema v23`);
    }
  }
  if (s.schemaVersion >= 24) {
    if ((s.webDatabaseCatalog?.count ?? 0) < 20) {
      fail(`${label}: webDatabaseCatalog.count must be >= 20 for schema v24`);
    }
    if (s.pathKnowledge?.schemaVersion !== 3) {
      fail(`${label}: pathKnowledge.schemaVersion must be 3 for schema v24`);
    }
    if (!s.migrationPlannerApi) {
      fail(`${label}: migrationPlannerApi must be set for schema v24`);
    }
    if (s.phpOracleSmoke?.emitFastifyOk !== true && s.phpOracleSmoke?.skipped == null) {
      fail(`${label}: phpOracleSmoke.emitFastifyOk must be true for schema v24 when not skipped`);
    }
    const pathParams = s.cwlPathParamsGold?.suiteIds ?? [];
    for (const id of ["cwl-path-params-hono", "cwl-path-params-fastify"]) {
      if (!pathParams.includes(id)) {
        fail(`${label}: cwlPathParamsGold must list ${id} for schema v24`);
      }
    }
  }
  if (s.schemaVersion >= 25) {
    const pathParams = s.cwlPathParamsGold?.suiteIds ?? [];
    if (!pathParams.includes("cwl-path-params-nextjs")) {
      fail(`${label}: cwlPathParamsGold must list cwl-path-params-nextjs for schema v25`);
    }
    const queryParams = s.cwlQueryParamsGold?.suiteIds ?? [];
    for (const id of ["cwl-query-params-hono", "cwl-query-params-fastify", "cwl-query-params-nextjs"]) {
      if (!queryParams.includes(id)) {
        fail(`${label}: cwlQueryParamsGold must list ${id} for schema v25`);
      }
    }
    if (!s.databaseDetectApi) {
      fail(`${label}: databaseDetectApi must be set for schema v25`);
    }
  }
  if (s.schemaVersion >= 26) {
    const ctx = s.cwlRequestContextGold?.suiteIds ?? [];
    for (const id of ["cwl-request-context-hono", "cwl-request-context-fastify", "cwl-request-context-nextjs"]) {
      if (!ctx.includes(id)) {
        fail(`${label}: cwlRequestContextGold must list ${id} for schema v26`);
      }
    }
    if (s.phpOracleSmoke?.wptpEmitNextjsAvailable === true && s.phpOracleSmoke?.emitNextjsOk !== true) {
      fail(`${label}: phpOracleSmoke.emitNextjsOk must be true when wptp-emit-nextjs is available`);
    }
    if (!s.knowledgeExport?.pathKnowledge || !s.knowledgeExport?.webDatabases) {
      fail(`${label}: knowledgeExport paths must be set for schema v26`);
    }
  }
  if (s.schemaVersion >= 27) {
    const body = s.cwlRequestBodyGold?.suiteIds ?? [];
    for (const id of ["cwl-request-body-hono", "cwl-request-body-fastify", "cwl-request-body-nextjs"]) {
      if (!body.includes(id)) {
        fail(`${label}: cwlRequestBodyGold must list ${id} for schema v27`);
      }
    }
    const status = s.cwlResponseStatusGold?.suiteIds ?? [];
    for (const id of ["cwl-response-status-hono", "cwl-response-status-fastify", "cwl-response-status-nextjs"]) {
      if (!status.includes(id)) {
        fail(`${label}: cwlResponseStatusGold must list ${id} for schema v27`);
      }
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 4) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 4 for schema v27`);
    }
    if (!s.migrationProgramsApi || !s.evidenceApi) {
      fail(`${label}: migrationProgramsApi and evidenceApi must be set for schema v27`);
    }
  }
  if (s.schemaVersion >= 28) {
    const auth = s.cwlAuthEffectsGold?.suiteIds ?? [];
    for (const id of ["cwl-auth-effects-hono", "cwl-auth-effects-fastify", "cwl-auth-effects-nextjs"]) {
      if (!auth.includes(id)) {
        fail(`${label}: cwlAuthEffectsGold must list ${id} for schema v28`);
      }
    }
    if (!s.laravelVerifyGaps?.exportScript) {
      fail(`${label}: laravelVerifyGaps.exportScript must be set for schema v28`);
    }
    if (s.phpNextjsVerify?.ok !== true && s.phpNextjsVerify?.skip !== "no-wptp-emit-nextjs") {
      fail(`${label}: phpNextjsVerify.ok must be true for schema v28 when WPTP is available`);
    }
    if (s.phpOracleSmoke?.verifyNextjsOk !== true && s.phpOracleSmoke?.wptpEmitNextjsAvailable === true) {
      fail(`${label}: phpOracleSmoke.verifyNextjsOk must be true when wptp available (schema v28)`);
    }
  }
  if (s.schemaVersion >= 29) {
    const exp = s.expressFlagshipGold?.suiteIds ?? [];
    for (const id of [
      "express-flagship-hono",
      "express-flagship-fastify",
      "express-flagship-nextjs",
      "express-flagship-cwl",
    ]) {
      if (!exp.includes(id)) {
        fail(`${label}: expressFlagshipGold must list ${id} for schema v29`);
      }
    }
    if (s.expressFlagshipGold?.ok !== true) {
      fail(`${label}: expressFlagshipGold.ok must be true for schema v29`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 132) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 132 for schema v29`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 105) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 105 for schema v29`);
    }
  }
  if (s.schemaVersion >= 30) {
    if (s.nodeExpressOracleVerify?.ok !== true) {
      fail(`${label}: nodeExpressOracleVerify.ok must be true for schema v30`);
    }
    if (
      typeof s.nodeExpressOracleVerify?.correctness !== "number" &&
      !isGceHubCompletionDeferred(s.nodeExpressOracleVerify)
    ) {
      fail(`${label}: nodeExpressOracleVerify.correctness must be set for schema v30`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 5) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 5 for schema v30 (Node pilot)`);
    }
  }
  if (s.schemaVersion >= 31) {
    if (s.plainPhpFlagshipGold?.ok !== true) {
      fail(`${label}: plainPhpFlagshipGold.ok must be true for schema v31`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 135) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 135 for schema v31`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 107) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 107 for schema v31`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 6) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 6 for schema v31 (plain PHP pilot)`);
    }
  }
  if (s.schemaVersion >= 32) {
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 138) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 138 for schema v32`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 110) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 110 for schema v32`);
    }
    if (!Array.isArray(s.cwlResponseContentTypeGold?.suiteIds) || s.cwlResponseContentTypeGold.suiteIds.length < 3) {
      fail(`${label}: cwlResponseContentTypeGold.suiteIds must list RFC-0008 suites for schema v32`);
    }
  }
  if (s.schemaVersion >= 33) {
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 144) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 144 for schema v33`);
    }
    if ((s.traceReplay?.expectedSuiteCount ?? 0) < 115) {
      fail(`${label}: traceReplay.expectedSuiteCount must be >= 115 for schema v33`);
    }
    if (s.symfonyFlagshipGold?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.ok must be true for schema v33`);
    }
    if ((s.capabilityMatrix?.oracleProductPairCount ?? 0) < 7) {
      fail(`${label}: capabilityMatrix.oracleProductPairCount must be >= 7 for schema v33 (Symfony pilot)`);
    }
  }
  const gceFast =
    s.gceHubCompletionFast === true || isGceHubCompletionDeferred(s.nodeExpressOracleVerify);
  if (gceFast) {
    if (s.ok !== true) {
      fail(`${label}: ok must be true on GCE fast path`);
    }
    const g = s.routeGrades;
    if (!g || typeof g.gold !== "number" || typeof g.silver !== "number" || typeof g.open !== "number") {
      fail(`${label}: missing routeGrades counts on GCE fast path`);
    }
    console.log(
      `${label} OK (GCE fast path): gold=${g.gold} matrixPassed=${s.matrixSmoke?.passed} goldSuites=${s.goldVerify?.suiteCount}`,
    );
    return;
  }
  if (s.schemaVersion >= 34) {
    if (s.symfonyFlagshipGold?.routesYamlParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesYamlParity.ok must be true for schema v34`);
    }
  }
  if (s.schemaVersion >= 35) {
    if (s.symfonyFlagshipGold?.routesAttributeParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesAttributeParity.ok must be true for schema v35`);
    }
  }
  if (s.schemaVersion >= 36) {
    if (s.symfonyFlagshipGold?.attributePrefixParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.attributePrefixParity.ok must be true for schema v36`);
    }
  }
  if (s.schemaVersion >= 37) {
    if (s.symfonyFlagshipGold?.attributeMethodsParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.attributeMethodsParity.ok must be true for schema v37`);
    }
  }
  if (s.schemaVersion >= 38) {
    if (s.symfonyFlagshipGold?.routesNameParity?.ok !== true) {
      fail(`${label}: symfonyFlagshipGold.routesNameParity.ok must be true for schema v38`);
    }
  }
  if (s.schemaVersion >= 39) {
    for (const [name, block] of [
      ["plainPhpFlagshipGold", s.plainPhpFlagshipGold],
      ["symfonyFlagshipGold", s.symfonyFlagshipGold],
    ]) {
      const cp = block?.cwlProjection;
      if (cp != null) {
        if (typeof cp.total !== "number" || typeof cp.holeFree !== "number") {
          fail(`${label}: ${name}.cwlProjection must carry numeric total/holeFree for schema v39`);
        } else if (cp.holeFree !== cp.total) {
          fail(`${label}: ${name}.cwlProjection must be hole-free (holeFree ${cp.holeFree} !== total ${cp.total}) for schema v39`);
        }
      }
    }
  }
  if (s.schemaVersion >= 40) {
    const cp = s.expressFlagshipGold?.cwlProjection;
    if (cp != null) {
      if (typeof cp.total !== "number" || typeof cp.holeFree !== "number") {
        fail(`${label}: expressFlagshipGold.cwlProjection must carry numeric total/holeFree for schema v40`);
      } else if (cp.holeFree !== cp.total) {
        fail(`${label}: expressFlagshipGold.cwlProjection must be hole-free (holeFree ${cp.holeFree} !== total ${cp.total}) for schema v40`);
      }
    }
  }
  if (s.schemaVersion >= 41) {
    for (const [name, block] of [
      ["plainPhpFlagshipGold", s.plainPhpFlagshipGold],
      ["symfonyFlagshipGold", s.symfonyFlagshipGold],
      ["expressFlagshipGold", s.expressFlagshipGold],
    ]) {
      const ep = block?.emitParity;
      if (ep != null && ep.ok !== true) {
        fail(`${label}: ${name}.emitParity.ok must be true for schema v41`);
      }
    }
    if ((s.laravelVerifyGaps?.backlogItems ?? 0) > 0 && !s.laravelVerifyGaps?.ingestNext) {
      fail(`${label}: laravelVerifyGaps.ingestNext must be set when backlogItems > 0 for schema v41`);
    }
    if (!s.laravelVerifyGaps?.actionScript) {
      fail(`${label}: laravelVerifyGaps.actionScript must be set for schema v41`);
    }
    if (s.laravelMinSmoke?.ok !== true) {
      fail(`${label}: laravelMinSmoke.ok must be true for schema v41`);
    }
  }
  if (s.schemaVersion >= 42 && s.schemaVersion < 48) {
    if (!s.laravelVerifyGapsAction?.script) {
      fail(`${label}: laravelVerifyGapsAction.script must be set for schema v42`);
    }
    if (s.hubEvidence?.schemaVersion !== 3 && s.hubEvidence?.schemaVersion !== 4) {
      fail(`${label}: hubEvidence.schemaVersion must be 3 or 4 for schema v42+`);
    }
  }
  if (s.schemaVersion >= 43 && s.schemaVersion < 48) {
    if (s.hubEvidence?.schemaVersion !== 4) {
      fail(`${label}: hubEvidence.schemaVersion must be 4 for schema v43`);
    }
    if (!s.laravelVerifyLive?.script) {
      fail(`${label}: laravelVerifyLive.script must be set for schema v43`);
    }
  }
  if (s.schemaVersion >= 44) {
    if (s.phpOracleMicro?.fixture !== "fixtures/tiny-blog") {
      fail(`${label}: phpOracleMicro.fixture must be fixtures/tiny-blog for schema v44`);
    }
    if (s.cwlResponseStatusRuntime?.ok !== true) {
      fail(`${label}: cwlResponseStatusRuntime.ok must be true for schema v44`);
    }
    if (s.projectToCwlExport?.ok !== true) {
      fail(`${label}: projectToCwlExport.ok must be true for schema v44`);
    }
    if (s.laravelVerifyLive?.ok === false && s.laravelVerifyLive?.skip !== "missing-summary") {
      fail(`${label}: laravelVerifyLive.ok must be true when live summary exists for schema v44`);
    }
    if (
      s.phpNextjsFlagshipVerify?.ok !== true &&
      s.phpNextjsFlagshipVerify?.skip !== "no-wptp-emit-nextjs"
    ) {
      fail(`${label}: phpNextjsFlagshipVerify must pass or skip with no-wptp-emit-nextjs for schema v44`);
    }
  }
  if (s.schemaVersion >= 45) {
    if (s.cwlRequestBodyRuntime?.ok !== true) {
      fail(`${label}: cwlRequestBodyRuntime.ok must be true for schema v45`);
    }
    if (s.hubEvidenceSmoke?.ok !== true) {
      fail(`${label}: hubEvidenceSmoke.ok must be true for schema v45`);
    }
    if (s.contractCwlSmoke?.ok !== true) {
      fail(`${label}: contractCwlSmoke.ok must be true for schema v45`);
    }
    if (s.nodeOracleSpike?.ok !== true) {
      fail(`${label}: nodeOracleSpike.ok must be true for schema v45`);
    }
    if (s.projectToCwlExport?.express?.holeCount !== 0 && s.projectToCwlExport?.express != null) {
      fail(`${label}: projectToCwlExport.express must be hole-free for schema v45`);
    }
    if (
      s.phpNextjsSymfonyVerify?.ok !== true &&
      s.phpNextjsSymfonyVerify?.skip !== "no-wptp-emit-nextjs"
    ) {
      fail(`${label}: phpNextjsSymfonyVerify must pass or skip with no-wptp-emit-nextjs for schema v45`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE === "1" && s.laravelVerifyLive?.ok !== true) {
      fail(`${label}: laravelVerifyLive.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_LIVE=1`);
    }
    if (s.schemaVersion < 46 && s.capabilityMatrix?.schemaVersion !== 3) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 3 for schema v45`);
    }
  }
  if (s.schemaVersion >= 46) {
    if (s.cwlRequestBodyRuntime?.projectionOk !== true) {
      fail(`${label}: cwlRequestBodyRuntime.projectionOk must be true for schema v46`);
    }
    if (s.cwlBodyRoundtrip?.ok !== true) {
      fail(`${label}: cwlBodyRoundtrip.ok must be true for schema v46`);
    }
    if (s.hubTranslateE2e?.ok !== true && s.hubTranslateE2e?.skip !== "missing-cli-dist") {
      fail(`${label}: hubTranslateE2e must pass or skip with missing-cli-dist for schema v46`);
    }
    if (s.hubEvidenceLive?.ok !== true) {
      fail(`${label}: hubEvidenceLive.ok must be true for schema v46`);
    }
    if (s.nodeOracleSpike?.schemaVersion !== 3) {
      fail(`${label}: nodeOracleSpike.schemaVersion must be 3 for schema v46`);
    }
    if (process.env.CHRYSALIS_HUB_PIPELINE_GATE_STRICT === "1") {
      const pipelinePass =
        s.hubEvidenceLive?.profiles?.plainPhp?.evidence?.pipelineGatePass ??
        s.hubEvidenceLive?.pipelineGatePass;
      if (pipelinePass !== true) {
        fail(`${label}: hubEvidenceLive pipelineGatePass must be true when CHRYSALIS_HUB_PIPELINE_GATE_STRICT=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (s.schemaVersion < 47 && s.capabilityMatrix?.schemaVersion !== 4) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 4 for schema v46`);
    }
  }
  if (s.schemaVersion >= 47) {
    if (s.cwlRequestContextRuntime?.ok !== true) {
      fail(`${label}: cwlRequestContextRuntime.ok must be true for schema v47`);
    }
    if (s.cwlResponseContentTypeRuntime?.ok !== true) {
      fail(`${label}: cwlResponseContentTypeRuntime.ok must be true for schema v47`);
    }
    if (s.cwlAuthEffectsRuntime?.ok !== true) {
      fail(`${label}: cwlAuthEffectsRuntime.ok must be true for schema v47`);
    }
    if (s.cwlRfcRoundtrip?.ok !== true) {
      fail(`${label}: cwlRfcRoundtrip.ok must be true for schema v47`);
    }
    if (s.contractRoundtrip?.ok !== true) {
      fail(`${label}: contractRoundtrip.ok must be true for schema v47`);
    }
    if (s.deliveryPipelineSmoke?.ok !== true) {
      fail(`${label}: deliveryPipelineSmoke.ok must be true for schema v47`);
    }
    if (s.verifyPlaybooksSmoke?.ok !== true) {
      fail(`${label}: verifyPlaybooksSmoke.ok must be true for schema v47`);
    }
    if (s.hubRunnerSmoke?.ok !== true) {
      fail(`${label}: hubRunnerSmoke.ok must be true for schema v47`);
    }
    if (s.projectToCwlExport?.laravelMin?.ok !== true) {
      fail(`${label}: projectToCwlExport.laravelMin must pass for schema v47`);
    }
    if (s.projectToCwlExport?.tinyBlog?.ok !== true) {
      fail(`${label}: projectToCwlExport.tinyBlog must pass for schema v47`);
    }
    if (s.schemaVersion < 48 && s.capabilityMatrix?.schemaVersion !== 5) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 5 for schema v47`);
    }
  }
  if (s.schemaVersion >= 48) {
    if (!s.laravelVerifyGapsAction?.script) {
      fail(`${label}: laravelVerifyGapsAction.script must be set for schema v48`);
    }
    if (s.migrationOsSmoke?.ok !== true) {
      fail(`${label}: migrationOsSmoke.ok must be true for schema v48`);
    }
    if (s.cwlPreviewSmoke?.ok !== true) {
      fail(`${label}: cwlPreviewSmoke.ok must be true for schema v48`);
    }
    if (s.cwlOpenapiSmoke?.ok !== true) {
      fail(`${label}: cwlOpenapiSmoke.ok must be true for schema v48`);
    }
    if (s.pathAdviceSmoke?.ok !== true) {
      fail(`${label}: pathAdviceSmoke.ok must be true for schema v48`);
    }
    if (s.detectDatabasesSmoke?.ok !== true) {
      fail(`${label}: detectDatabasesSmoke.ok must be true for schema v48`);
    }
    if (s.postTranslateArtifactsSmoke?.ok !== true) {
      fail(`${label}: postTranslateArtifactsSmoke.ok must be true for schema v48`);
    }
    if (s.cwlMiddlewareSmoke?.ok !== true) {
      fail(`${label}: cwlMiddlewareSmoke.ok must be true for schema v48`);
    }
    if (s.cwlDiffSmoke?.ok !== true) {
      fail(`${label}: cwlDiffSmoke.ok must be true for schema v48`);
    }
    if (s.cwlAllRfcRoundtrip?.ok !== true) {
      fail(`${label}: cwlAllRfcRoundtrip.ok must be true for schema v48`);
    }
    if (s.evidenceTrendSmoke?.ok !== true) {
      fail(`${label}: evidenceTrendSmoke.ok must be true for schema v48`);
    }
    if (s.verifyGapsIngestSmoke?.ok !== true) {
      fail(`${label}: verifyGapsIngestSmoke.ok must be true for schema v48`);
    }
    if (s.deliveryPipelineSmoke?.schemaVersion !== 2) {
      fail(`${label}: deliveryPipelineSmoke.schemaVersion must be 2 for schema v48`);
    }
    if (s.deliveryPipelineSmoke?.profiles?.symfony?.ok !== true) {
      fail(`${label}: deliveryPipelineSmoke symfony profile must pass for schema v48`);
    }
    if (s.schemaVersion < 49 && s.hubEvidence?.schemaVersion !== 5) {
      fail(`${label}: hubEvidence.schemaVersion must be 5 for schema v48`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS === "1" && s.migrationOsSmoke?.ok !== true) {
      fail(`${label}: migrationOsSmoke.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS=1`);
    }
    if (s.schemaVersion < 49 && s.capabilityMatrix?.schemaVersion !== 6) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 6 for schema v48`);
    }
  }
  if (s.schemaVersion >= 49 && s.schemaVersion < 50) {
    if (s.cwlPathParamsRuntime?.ok !== true) {
      fail(`${label}: cwlPathParamsRuntime.ok must be true for schema v49`);
    }
    if (s.cwlQueryParamsRuntime?.ok !== true) {
      fail(`${label}: cwlQueryParamsRuntime.ok must be true for schema v49`);
    }
    if (s.cwlMultiGoldRuntime?.ok !== true) {
      fail(`${label}: cwlMultiGoldRuntime.ok must be true for schema v49`);
    }
    if (s.cwlParamsBatch?.ok !== true) {
      fail(`${label}: cwlParamsBatch.ok must be true for schema v49`);
    }
    if (s.migrationOsStandaloneBatch?.ok !== true) {
      fail(`${label}: migrationOsStandaloneBatch.ok must be true for schema v49`);
    }
    if (s.migrationOsSymfony?.ok !== true) {
      fail(`${label}: migrationOsSymfony.ok must be true for schema v49`);
    }
    if (s.hubRunnerBatchSmoke?.ok !== true) {
      fail(`${label}: hubRunnerBatchSmoke.ok must be true for schema v49`);
    }
    if (s.deliveryPipelineRunnerSmoke?.ok !== true) {
      fail(`${label}: deliveryPipelineRunnerSmoke.ok must be true for schema v49`);
    }
    if (s.cwlAllRfcRoundtrip?.schemaVersion !== 2) {
      fail(`${label}: cwlAllRfcRoundtrip.schemaVersion must be 2 for schema v49`);
    }
    if (s.hubEvidence?.schemaVersion !== 6) {
      fail(`${label}: hubEvidence.schemaVersion must be 6 for schema v49`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS === "1" && s.cwlParamsBatch?.ok !== true) {
      fail(`${label}: cwlParamsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 7) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 7 for schema v49`);
    }
    if (s.plainPhpFlagshipGold?.inProcess !== true) {
      fail(`${label}: plainPhpFlagshipGold.inProcess must be true for schema v49`);
    }
    if (s.symfonyFlagshipGold?.inProcess !== true) {
      fail(`${label}: symfonyFlagshipGold.inProcess must be true for schema v49`);
    }
  }
  if (s.schemaVersion >= 50 && s.schemaVersion < 51) {
    if (s.expressDeliveryBatch?.ok !== true) {
      fail(`${label}: expressDeliveryBatch.ok must be true for schema v50`);
    }
    if (s.symfonyMigrationOsBatch?.ok !== true) {
      fail(`${label}: symfonyMigrationOsBatch.ok must be true for schema v50`);
    }
    if (s.cwlInterchangeBatch?.ok !== true) {
      fail(`${label}: cwlInterchangeBatch.ok must be true for schema v50`);
    }
    if (s.cwlParamsRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlParamsRoundtripBatch.ok must be true for schema v50`);
    }
    if (s.cwlMultiBatch?.ok !== true) {
      fail(`${label}: cwlMultiBatch.ok must be true for schema v50`);
    }
    if (s.evidenceLiveStandaloneBatch?.ok !== true) {
      fail(`${label}: evidenceLiveStandaloneBatch.ok must be true for schema v50`);
    }
    if (s.translateE2eStandaloneBatch?.ok !== true) {
      fail(`${label}: translateE2eStandaloneBatch.ok must be true for schema v50`);
    }
    if (s.projectToCwlExpressSmoke?.ok !== true) {
      fail(`${label}: projectToCwlExpressSmoke.ok must be true for schema v50`);
    }
    if (s.hubRunnerBatchSmoke?.schemaVersion !== 2) {
      fail(`${label}: hubRunnerBatchSmoke.schemaVersion must be 2 for schema v50`);
    }
    if (s.hubEvidence?.schemaVersion !== 7) {
      fail(`${label}: hubEvidence.schemaVersion must be 7 for schema v50`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY === "1" && s.expressDeliveryBatch?.ok !== true) {
      fail(`${label}: expressDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 8) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 8 for schema v50`);
    }
    if (s.expressFlagshipGold?.inProcess !== true) {
      fail(`${label}: expressFlagshipGold.inProcess must be true for schema v50`);
    }
  }
  if (s.schemaVersion >= 51 && s.schemaVersion < 52) {
    if (s.laravelMinDeliveryBatch?.ok !== true) {
      fail(`${label}: laravelMinDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.plainPhpDeliveryBatch?.ok !== true) {
      fail(`${label}: plainPhpDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.threeOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: threeOriginDeliveryBatch.ok must be true for schema v51`);
    }
    if (s.laravelDepthBatch?.ok !== true) {
      fail(`${label}: laravelDepthBatch.ok must be true for schema v51`);
    }
    if (s.cwlFullBatch?.ok !== true) {
      fail(`${label}: cwlFullBatch.ok must be true for schema v51`);
    }
    if (s.projectToCwlLaravelMinSmoke?.ok !== true) {
      fail(`${label}: projectToCwlLaravelMinSmoke.ok must be true for schema v51`);
    }
    if (s.tinyBlogOracleBatch?.ok !== true) {
      fail(`${label}: tinyBlogOracleBatch.ok must be true for schema v51`);
    }
    if (s.hubEvidence?.schemaVersion !== 8) {
      fail(`${label}: hubEvidence.schemaVersion must be 8 for schema v51`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN === "1" && s.laravelMinDeliveryBatch?.ok !== true) {
      fail(`${label}: laravelMinDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 9) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 9 for schema v51`);
    }
  }
  if (s.schemaVersion >= 52 && s.schemaVersion < 53) {
    if (s.fourOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: fourOriginDeliveryBatch.ok must be true for schema v52`);
    }
    if (s.symfonyDeliveryBatch?.ok !== true) {
      fail(`${label}: symfonyDeliveryBatch.ok must be true for schema v52`);
    }
    if (s.fullDeliveryMegaBatch?.ok !== true) {
      fail(`${label}: fullDeliveryMegaBatch.ok must be true for schema v52`);
    }
    if (s.cwlMegaBatch?.ok !== true) {
      fail(`${label}: cwlMegaBatch.ok must be true for schema v52`);
    }
    if (s.oracleStandaloneBatch?.ok !== true) {
      fail(`${label}: oracleStandaloneBatch.ok must be true for schema v52`);
    }
    if (s.laravelMinMigrationOsBatch?.ok !== true) {
      fail(`${label}: laravelMinMigrationOsBatch.ok must be true for schema v52`);
    }
    if (s.deliveryPipelineStandaloneBatch?.ok !== true) {
      fail(`${label}: deliveryPipelineStandaloneBatch.ok must be true for schema v52`);
    }
    if (s.hubEvidence?.schemaVersion !== 9) {
      fail(`${label}: hubEvidence.schemaVersion must be 9 for schema v52`);
    }
    if (s.hubRunnerBatchSmoke?.schemaVersion !== 3) {
      fail(`${label}: hubRunnerBatchSmoke.schemaVersion must be 3 for schema v52`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN === "1" && s.fourOriginDeliveryBatch?.ok !== true) {
      fail(`${label}: fourOriginDeliveryBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 10) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 10 for schema v52`);
    }
  }
  if (s.schemaVersion >= 53 && s.schemaVersion < 54) {
    if (s.allDeliveryUltraMegaBatch?.ok !== true) {
      fail(`${label}: allDeliveryUltraMegaBatch.ok must be true for schema v53`);
    }
    if (s.migrationOsMegaBatch?.ok !== true) {
      fail(`${label}: migrationOsMegaBatch.ok must be true for schema v53`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v53`);
    }
    if (s.advisoryStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: advisoryStandaloneMegaBatch.ok must be true for schema v53`);
    }
    if (s.postTranslateVerifyOriginBatch?.ok !== true) {
      fail(`${label}: postTranslateVerifyOriginBatch.ok must be true for schema v53`);
    }
    if (s.tinyBlogDepthBatch?.ok !== true) {
      fail(`${label}: tinyBlogDepthBatch.ok must be true for schema v53`);
    }
    if (s.hubEvidence?.schemaVersion !== 10) {
      fail(`${label}: hubEvidence.schemaVersion must be 10 for schema v53`);
    }
    if (s.deliveryPipelineRunnerSmoke?.schemaVersion !== 3) {
      fail(`${label}: deliveryPipelineRunnerSmoke.schemaVersion must be 3 for schema v53`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA === "1" && s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 11) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 11 for schema v53`);
    }
  }
  if (s.schemaVersion >= 54 && s.schemaVersion < 55) {
    if (s.originDepthUltraBatch?.ok !== true) {
      fail(`${label}: originDepthUltraBatch.ok must be true for schema v54`);
    }
    if (s.chimeraAssessmentMegaBatch?.ok !== true) {
      fail(`${label}: chimeraAssessmentMegaBatch.ok must be true for schema v54`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v54`);
    }
    if (s.chimeraCutoverOriginBatch?.ok !== true) {
      fail(`${label}: chimeraCutoverOriginBatch.ok must be true for schema v54`);
    }
    if (s.hubEvidence?.schemaVersion !== 11) {
      fail(`${label}: hubEvidence.schemaVersion must be 11 for schema v54`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH === "1" && s.originDepthUltraBatch?.ok !== true) {
      fail(`${label}: originDepthUltraBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 12) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 12 for schema v54`);
    }
  }
  if (s.schemaVersion >= 55 && s.schemaVersion < 56) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v55`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v55`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v55`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v55`);
    }
    if (s.hubEvidence?.schemaVersion !== 12) {
      fail(`${label}: hubEvidence.schemaVersion must be 12 for schema v55`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 13) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 13 for schema v55`);
    }
  }
  if (s.schemaVersion >= 56 && s.schemaVersion < 57) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v56`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v56`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v56`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v56`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true for schema v56`);
    }
    if (s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true for schema v56`);
    }
    if ((s.cwlPatternLiteralCwlBatch?.suiteCount ?? 0) < 18) {
      fail(`${label}: cwlPatternLiteralCwlBatch.suiteCount must be >= 18 for schema v56`);
    }
    if (s.hubEvidence?.schemaVersion !== 13) {
      fail(`${label}: hubEvidence.schemaVersion must be 13 for schema v56`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL === "1" && s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL === "1" && s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 14) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 14 for schema v56`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v56`);
    }
  }
  if (s.schemaVersion >= 57 && s.schemaVersion < 58) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v57`);
    }
    if (s.cwlAllOriginsBatch?.ok !== true) {
      fail(`${label}: cwlAllOriginsBatch.ok must be true for schema v57`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v57`);
    }
    if ((s.projectToCwlAllOrigins?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlAllOrigins.originCount must be >= 23 for schema v57`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL === "1" && s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL=1`);
    }
    if (s.cwlPatternLiteralCwlBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralCwlBatch.ok must be true for schema v57`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v57`);
    }
    if (s.hubTranslateCwlCoverage?.ok !== true) {
      fail(`${label}: hubTranslateCwlCoverage.ok must be true for schema v57`);
    }
    if ((s.hubTranslateCwlCoverage?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlCoverage.originCount must be >= 23 for schema v57`);
    }
    if ((s.cwlPatternLiteralRoundtripBatch?.suiteCount ?? 0) < 21) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.suiteCount must be >= 21 for schema v57`);
    }
    if (s.hubEvidence?.schemaVersion !== 14) {
      fail(`${label}: hubEvidence.schemaVersion must be 14 for schema v57`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP === "1" && s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS === "1" && (s.hubTranslateCwlCoverage?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlCoverage.originCount must be >= 23 when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 15) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 15 for schema v57`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v57`);
    }
  }
  if (s.schemaVersion >= 58 && s.schemaVersion < 59) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v58`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v58`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 2 for schema v58`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v58`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v58`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v58`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v58`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v58`);
    }
    if (s.hubEvidence?.schemaVersion !== 15) {
      fail(`${label}: hubEvidence.schemaVersion must be 15 for schema v58`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 16) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 16 for schema v58`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v58`);
    }
  }
  if (s.schemaVersion >= 59 && s.schemaVersion < 60) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v59`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v59`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 3 for schema v59`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v59`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v59`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v59`);
    }
    if (s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true for schema v59`);
    }
    if ((s.projectToCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlRoundtrip.originCount must be >= 23 for schema v59`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v59`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v59`);
    }
    if (s.hubEvidence?.schemaVersion !== 16) {
      fail(`${label}: hubEvidence.schemaVersion must be 16 for schema v59`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP === "1" && s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 17) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 17 for schema v59`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v59`);
    }
  }
  if (s.schemaVersion >= 60 && s.schemaVersion < 61) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v60`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v60`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v60`);
    }
    if (s.cwlPatternLiteralRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlPatternLiteralRoundtripBatch.ok must be true for schema v60`);
    }
    if (s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true for schema v60`);
    }
    if (s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true for schema v60`);
    }
    if (s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true for schema v60`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v60`);
    }
    if ((s.projectToCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: projectToCwlRoundtrip.originCount must be >= 23 for schema v60`);
    }
    if ((s.hubTranslateCwlRoundtrip?.originCount ?? 0) < 23) {
      fail(`${label}: hubTranslateCwlRoundtrip.originCount must be >= 23 for schema v60`);
    }
    if ((s.cwlFlagshipRoundtripBatch?.suiteCount ?? 0) < 3) {
      fail(`${label}: cwlFlagshipRoundtripBatch.suiteCount must be >= 3 for schema v60`);
    }
    if (s.hubEvidence?.schemaVersion !== 17) {
      fail(`${label}: hubEvidence.schemaVersion must be 17 for schema v60`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP === "1" && s.projectToCwlRoundtrip?.ok !== true) {
      fail(`${label}: projectToCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP === "1" && s.hubTranslateCwlRoundtrip?.ok !== true) {
      fail(`${label}: hubTranslateCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP === "1" && s.cwlFlagshipRoundtripBatch?.ok !== true) {
      fail(`${label}: cwlFlagshipRoundtripBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 18) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 18 for schema v60`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v60`);
    }
  }
  if (s.schemaVersion >= 61 && s.schemaVersion < 62) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v61`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v61`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v61`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v61`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v61`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 2 for schema v61`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v61`);
    }
    if (s.hubEvidence?.schemaVersion !== 18) {
      fail(`${label}: hubEvidence.schemaVersion must be 18 for schema v61`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 19) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 19 for schema v61`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v61`);
    }
  }
  if (s.schemaVersion >= 62 && s.schemaVersion < 63) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v62`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v62`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v62`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v62`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v62`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v62`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 3 for schema v62`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v62`);
    }
    if (s.hubEvidence?.schemaVersion !== 19) {
      fail(`${label}: hubEvidence.schemaVersion must be 19 for schema v62`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP === "1" && s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 20) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 20 for schema v62`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v62`);
    }
  }
  if (s.schemaVersion >= 63 && s.schemaVersion < 64) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v63`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v63`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v63`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v63`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v63`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v63`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v63`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v63`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v63`);
    }
    if (s.hubEvidence?.schemaVersion !== 20) {
      fail(`${label}: hubEvidence.schemaVersion must be 20 for schema v63`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 21) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 21 for schema v63`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v63`);
    }
  }
  if (s.schemaVersion >= 64 && s.schemaVersion < 65) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v64`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v64`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v64`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v64`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v64`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v64`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v64`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v64`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v64`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v64`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v64`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v64`);
    }
    if (s.hubEvidence?.schemaVersion !== 21) {
      fail(`${label}: hubEvidence.schemaVersion must be 21 for schema v64`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 22) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 22 for schema v64`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v64`);
    }
  }
  if (s.schemaVersion >= 65 && s.schemaVersion < 66) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v65`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v65`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v65`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v65`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v65`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v65`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v65`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v65`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v65`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v65`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v65`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v65`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v65`);
    }
    if (s.hubEvidence?.schemaVersion !== 22) {
      fail(`${label}: hubEvidence.schemaVersion must be 22 for schema v65`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 23) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 23 for schema v65`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v65`);
    }
  }
  if (s.schemaVersion >= 66 && s.schemaVersion < 67) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v66`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v66`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v66`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v66`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v66`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v66`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v66`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v66`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v66`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v66`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v66`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v66`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v66`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v66`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 2 for schema v66`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v66`);
    }
    if (s.hubEvidence?.schemaVersion !== 23) {
      fail(`${label}: hubEvidence.schemaVersion must be 23 for schema v66`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 24) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 24 for schema v66`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v66`);
    }
  }
  if (s.schemaVersion >= 67 && s.schemaVersion < 68) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v67`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v67`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v67`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v67`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v67`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v67`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v67`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v67`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v67`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v67`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v67`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v67`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 4 for schema v67`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v67`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 2 for schema v67`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v67`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 3 for schema v67`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v67`);
    }
    if (s.hubEvidence?.schemaVersion !== 24) {
      fail(`${label}: hubEvidence.schemaVersion must be 24 for schema v67`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 25) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 25 for schema v67`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v67`);
    }
  }
  if (s.schemaVersion >= 68 && s.schemaVersion < 69) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v68`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v68`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v68`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v68`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v68`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v68`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v68`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 2 for schema v68`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v68`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v68`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v68`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v68`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v68`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v68`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 5 for schema v68`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v68`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 3 for schema v68`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v68`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 4 for schema v68`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v68`);
    }
    if (s.hubEvidence?.schemaVersion !== 25) {
      fail(`${label}: hubEvidence.schemaVersion must be 25 for schema v68`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 26) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 26 for schema v68`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v68`);
    }
  }
  if (s.schemaVersion >= 69 && s.schemaVersion < 70) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v69`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v69`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v69`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v69`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v69`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v69`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v69`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 3 for schema v69`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v69`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v69`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v69`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v69`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v69`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v69`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 2 for schema v69`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v69`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 6 for schema v69`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v69`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 4 for schema v69`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v69`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 5 for schema v69`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v69`);
    }
    if (s.hubEvidence?.schemaVersion !== 26) {
      fail(`${label}: hubEvidence.schemaVersion must be 26 for schema v69`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 27) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 27 for schema v69`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v69`);
    }
  }
  if (s.schemaVersion >= 70 && s.schemaVersion < 71) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v70`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v70`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v70`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v70`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v70`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v70`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v70`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 4 for schema v70`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v70`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v70`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v70`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 2) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 2 for schema v70`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v70`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v70`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 3 for schema v70`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v70`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v70`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 7 for schema v70`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v70`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 5 for schema v70`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v70`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 6 for schema v70`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v70`);
    }
    if (s.hubEvidence?.schemaVersion !== 27) {
      fail(`${label}: hubEvidence.schemaVersion must be 27 for schema v70`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE === "1" && s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 28) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 28 for schema v70`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v70`);
    }
  }
  if (s.schemaVersion >= 71 && s.schemaVersion < 72) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v71`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v71`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v71`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v71`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v71`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v71`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v71`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 5 for schema v71`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v71`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v71`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v71`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 3) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 3 for schema v71`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v71`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v71`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 4 for schema v71`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v71`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v71`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v71`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v71`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v71`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 8 for schema v71`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v71`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 6 for schema v71`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v71`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 7 for schema v71`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v71`);
    }
    if (s.hubEvidence?.schemaVersion !== 28) {
      fail(`${label}: hubEvidence.schemaVersion must be 28 for schema v71`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE === "1" && s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH === "1" && s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH === "1" && s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH === "1" && s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH === "1" && s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH === "1" && s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH === "1" && s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH=1`);
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS === "1") {
      if (s.wptpStrictBatch?.skip != null) {
        fail(`${label}: wptpStrictBatch.skip must be null when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.wptpEmitNextjsAvailable !== true) {
        fail(`${label}: wptpStrictBatch.wptpEmitNextjsAvailable must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.wptpStrictBatch?.ok !== true) {
        fail(`${label}: wptpStrictBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsVerifyBatch?.ok !== true) {
        fail(`${label}: phpNextjsVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsFlagshipVerify?.ok !== true) {
        fail(`${label}: phpNextjsFlagshipVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
      if (s.phpNextjsSymfonyVerify?.ok !== true) {
        fail(`${label}: phpNextjsSymfonyVerify.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS=1`);
      }
    }
    if (process.env.CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY === "1" && s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true when CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 29) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 29 for schema v71`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v71`);
    }
  }
  if (s.schemaVersion >= 72) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v72`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v72`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v72`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v72`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v72`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v72`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v72`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 6 for schema v72`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v72`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v72`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v72`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 4 for schema v72`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v72`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v72`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 5 for schema v72`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v72`);
    }
    if (s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true for schema v72`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v72`);
    }
    if (s.flagshipVerifyHttp?.ok !== true) {
      fail(`${label}: flagshipVerifyHttp.ok must be true for schema v72`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v72`);
    }
    if (s.irHelperLiftingSemantic?.ok !== true) {
      fail(`${label}: irHelperLiftingSemantic.ok must be true for schema v72`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 9) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 9 for schema v72`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v72`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 7 for schema v72`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v72`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 8 for schema v72`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v72`);
    }
    if (s.schemaVersion < 73 && s.hubEvidence?.schemaVersion !== 29) {
      fail(`${label}: hubEvidence.schemaVersion must be 29 for schema v72`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP === "1" && s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (s.schemaVersion < 73 && s.capabilityMatrix?.schemaVersion !== 30) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 30 for schema v72`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v72`);
    }
  }
  if (s.schemaVersion >= 73) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v73`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v73`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v73`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v73`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v73`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v73`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v73`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 7 for schema v73`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v73`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v73`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v73`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 5 for schema v73`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v73`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v73`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 6) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 6 for schema v73`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v73`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v73`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v73`);
    }
    if (s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true for schema v73`);
    }
    if (s.laravelAuthProbeVerifyHttpFastify?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttpFastify.ok must be true for schema v73`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v73`);
    }
    if (s.flagshipVerifyHttp?.ok !== true) {
      fail(`${label}: flagshipVerifyHttp.ok must be true for schema v73`);
    }
    if (s.flagshipVerifyHttpFastify?.ok !== true) {
      fail(`${label}: flagshipVerifyHttpFastify.ok must be true for schema v73`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v73`);
    }
    if (s.irHelperLiftingSemantic?.ok !== true) {
      fail(`${label}: irHelperLiftingSemantic.ok must be true for schema v73`);
    }
    if (s.irHelperLiftingEmbed?.ok !== true) {
      fail(`${label}: irHelperLiftingEmbed.ok must be true for schema v73`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 10) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 10 for schema v73`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v73`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 8 for schema v73`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v73`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 9) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 9 for schema v73`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v73`);
    }
    if (s.schemaVersion < 74 && s.hubEvidence?.schemaVersion !== 30) {
      fail(`${label}: hubEvidence.schemaVersion must be 30 for schema v73`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP === "1" && s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (s.schemaVersion < 74 && s.capabilityMatrix?.schemaVersion !== 31) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 31 for schema v73`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v73`);
    }
  }
  if (s.schemaVersion >= 74) {
    if (s.projectToCwlAllOrigins?.ok !== true) {
      fail(`${label}: projectToCwlAllOrigins.ok must be true for schema v74`);
    }
    if (s.cwlUniversalMegaBatch?.ok !== true) {
      fail(`${label}: cwlUniversalMegaBatch.ok must be true for schema v74`);
    }
    if ((s.cwlUniversalMegaBatch?.schemaVersion ?? 0) < 4) {
      fail(`${label}: cwlUniversalMegaBatch.schemaVersion must be >= 4 for schema v74`);
    }
    if (s.contractImportCwlRoundtrip?.ok !== true) {
      fail(`${label}: contractImportCwlRoundtrip.ok must be true for schema v74`);
    }
    if (s.phpOracleMicroVerifyBatch?.ok !== true) {
      fail(`${label}: phpOracleMicroVerifyBatch.ok must be true for schema v74`);
    }
    if (s.phpNextjsVerifyBatch?.ok !== true) {
      fail(`${label}: phpNextjsVerifyBatch.ok must be true for schema v74`);
    }
    if (s.phpWedgeBatch?.ok !== true) {
      fail(`${label}: phpWedgeBatch.ok must be true for schema v74`);
    }
    if ((s.phpWedgeBatch?.schemaVersion ?? 0) < 8) {
      fail(`${label}: phpWedgeBatch.schemaVersion must be >= 8 for schema v74`);
    }
    if (s.hubEvidenceMvpBatch?.ok !== true) {
      fail(`${label}: hubEvidenceMvpBatch.ok must be true for schema v74`);
    }
    if (s.wptpStrictBatch?.ok !== true) {
      fail(`${label}: wptpStrictBatch.ok must be true for schema v74`);
    }
    if (s.flagshipFullGapsBatch?.ok !== true) {
      fail(`${label}: flagshipFullGapsBatch.ok must be true for schema v74`);
    }
    if ((s.flagshipFullGapsBatch?.schemaVersion ?? 0) < 5) {
      fail(`${label}: flagshipFullGapsBatch.schemaVersion must be >= 5 for schema v74`);
    }
    if (s.gapsIngestClosureBatch?.ok !== true) {
      fail(`${label}: gapsIngestClosureBatch.ok must be true for schema v74`);
    }
    if (s.gapsIngestStrictBatch?.ok !== true) {
      fail(`${label}: gapsIngestStrictBatch.ok must be true for schema v74`);
    }
    if ((s.gapsIngestStrictBatch?.schemaVersion ?? 0) < 7) {
      fail(`${label}: gapsIngestStrictBatch.schemaVersion must be >= 7 for schema v74`);
    }
    if (s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true for schema v74`);
    }
    if (s.laravelAuthProbeVerifyClosure?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyClosure.ok must be true for schema v74`);
    }
    if (s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true for schema v74`);
    }
    if (s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true for schema v74`);
    }
    if (s.laravelAuthProbeVerifyHttpFastify?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttpFastify.ok must be true for schema v74`);
    }
    if (s.laravelAuthProbeReingestVerifyHttpFastify?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingestVerifyHttpFastify.ok must be true for schema v74`);
    }
    if (s.flagshipVerifyReplay?.ok !== true) {
      fail(`${label}: flagshipVerifyReplay.ok must be true for schema v74`);
    }
    if (s.flagshipVerifyHttp?.ok !== true) {
      fail(`${label}: flagshipVerifyHttp.ok must be true for schema v74`);
    }
    if (s.flagshipVerifyHttpFastify?.ok !== true) {
      fail(`${label}: flagshipVerifyHttpFastify.ok must be true for schema v74`);
    }
    if (s.irHelperLifting?.ok !== true) {
      fail(`${label}: irHelperLifting.ok must be true for schema v74`);
    }
    if (s.irHelperLiftingSemantic?.ok !== true) {
      fail(`${label}: irHelperLiftingSemantic.ok must be true for schema v74`);
    }
    if (s.irHelperLiftingEmbed?.ok !== true) {
      fail(`${label}: irHelperLiftingEmbed.ok must be true for schema v74`);
    }
    if (s.irHelperLiftingFullPath?.ok !== true) {
      fail(`${label}: irHelperLiftingFullPath.ok must be true for schema v74`);
    }
    if ((s.oracleProductUltraBatch?.schemaVersion ?? 0) < 11) {
      fail(`${label}: oracleProductUltraBatch.schemaVersion must be >= 11 for schema v74`);
    }
    if (s.oracleProductUltraBatch?.ok !== true) {
      fail(`${label}: oracleProductUltraBatch.ok must be true for schema v74`);
    }
    if ((s.evidenceStandaloneMegaBatch?.schemaVersion ?? 0) < 9) {
      fail(`${label}: evidenceStandaloneMegaBatch.schemaVersion must be >= 9 for schema v74`);
    }
    if (s.evidenceStandaloneMegaBatch?.ok !== true) {
      fail(`${label}: evidenceStandaloneMegaBatch.ok must be true for schema v74`);
    }
    if ((s.verifyProductUltraBatch?.schemaVersion ?? 0) < 10) {
      fail(`${label}: verifyProductUltraBatch.schemaVersion must be >= 10 for schema v74`);
    }
    if (s.verifyProductUltraBatch?.ok !== true) {
      fail(`${label}: verifyProductUltraBatch.ok must be true for schema v74`);
    }
    if (s.hubEvidence?.schemaVersion !== 31) {
      fail(`${label}: hubEvidence.schemaVersion must be 31 for schema v74`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP === "1" && s.laravelAuthProbeVerifyHttp?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyHttp.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY === "1" && s.laravelAuthProbeVerifyReplay?.ok !== true) {
      fail(`${label}: laravelAuthProbeVerifyReplay.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1`);
    }
    if (process.env.CHRYSALIS_HUB_GAP_REINGEST_STRICT === "1" && s.laravelAuthProbeReingest?.ok !== true) {
      fail(`${label}: laravelAuthProbeReingest.ok must be true when CHRYSALIS_HUB_GAP_REINGEST_STRICT=1`);
    }
    if (s.capabilityMatrix?.schemaVersion !== 32) {
      fail(`${label}: capabilityMatrix.schemaVersion must be 32 for schema v74`);
    }
    if ((s.goldVerify?.expectedSuiteCount ?? 0) < 154) {
      fail(`${label}: goldVerify.expectedSuiteCount must be >= 154 for schema v74`);
    }
  }
  if (s.schemaVersion >= 133) {
    if (s.fullstackAuthoringBatchV60?.ok !== true) {
      fail(`${label}: fullstackAuthoringBatchV60.ok must be true for schema v133`);
    }
  }
  if (s.schemaVersion >= 134) {
    if (s.fullstackAuthoringBatchV61?.ok !== true) {
      fail(`${label}: fullstackAuthoringBatchV61.ok must be true for schema v134`);
    }
    if (!s.fullstackAuthoringBatchV61?.script) {
      fail(`${label}: fullstackAuthoringBatchV61.script must be set for schema v134`);
    }
  }
  if (s.schemaVersion >= 135) {
    if (s.fullstackAuthoringBatchV62?.ok !== true) {
      fail(`${label}: fullstackAuthoringBatchV62.ok must be true for schema v135`);
    }
    if (!s.fullstackAuthoringBatchV62?.script) {
      fail(`${label}: fullstackAuthoringBatchV62.script must be set for schema v135`);
    }
  }
  if (s.schemaVersion >= 136) {
    if (s.fullstackAuthoringBatchV63?.ok !== true) {
      fail(`${label}: fullstackAuthoringBatchV63.ok must be true for schema v136`);
    }
    if (!s.fullstackAuthoringBatchV63?.script) {
      fail(`${label}: fullstackAuthoringBatchV63.script must be set for schema v136`);
    }
  }
  for (const [ver, key] of [
    [137, "fullstackAuthoringBatchV64"],
    [138, "fullstackAuthoringBatchV65"],
    [139, "fullstackAuthoringBatchV66"],
    [140, "fullstackAuthoringBatchV67"],
    [141, "fullstackAuthoringBatchV68"],
    [142, "fullstackAuthoringBatchV69"],
    [143, "fullstackAuthoringBatchV70"],
    [144, "fullstackAuthoringBatchV71"],
    [145, "fullstackAuthoringBatchV72"],
    [146, "fullstackAuthoringBatchV73"],
    [147, "fullstackAuthoringBatchV74"],
    [148, "fullstackAuthoringBatchV75"],
    [149, "fullstackAuthoringBatchV76"],
    [150, "fullstackAuthoringBatchV77"],
    [151, "fullstackAuthoringBatchV78"],
    [152, "fullstackAuthoringBatchV79"],
    [153, "fullstackAuthoringBatchV80"],
    [154, "fullstackAuthoringBatchV81"],
    [155, "fullstackAuthoringBatchV82"],
    [156, "fullstackAuthoringBatchV83"],
    [157, "fullstackAuthoringBatchV84"],
    [158, "fullstackAuthoringBatchV85"],
    [159, "fullstackAuthoringBatchV86"],
    [160, "fullstackAuthoringBatchV87"],
    [161, "fullstackAuthoringBatchV88"],
    [162, "fullstackAuthoringBatchV89"],
    [163, "fullstackAuthoringBatchV90"],
    [164, "fullstackAuthoringBatchV91"],
    [165, "fullstackAuthoringBatchV92"],
    [166, "fullstackAuthoringBatchV93"],
    [167, "fullstackAuthoringBatchV94"],
    [168, "fullstackAuthoringBatchV95"],
    [169, "fullstackAuthoringBatchV96"],
    [170, "fullstackAuthoringBatchV97"],
    [171, "fullstackAuthoringBatchV98"],
    [172, "fullstackAuthoringBatchV99"],
    [173, "fullstackAuthoringBatchV100"],
    [174, "fullstackAuthoringBatchV101"],
    [175, "fullstackAuthoringBatchV102"],
    [176, "fullstackAuthoringBatchV103"],
    [177, "fullstackAuthoringBatchV104"],
    [178, "fullstackAuthoringBatchV105"],
    [179, "fullstackAuthoringBatchV106"],
    [180, "fullstackAuthoringBatchV107"],
    [181, "fullstackAuthoringBatchV108"],
    [182, "fullstackAuthoringBatchV109"],
    [183, "fullstackAuthoringBatchV110"],
    [184, "fullstackAuthoringBatchV111"],
    [185, "fullstackAuthoringBatchV112"],
    [186, "fullstackAuthoringBatchV113"],
    [187, "fullstackAuthoringBatchV114"],
    [188, "fullstackAuthoringBatchV115"],
    [189, "fullstackAuthoringBatchV116"],
    [190, "fullstackAuthoringBatchV117"],
    [191, "fullstackAuthoringBatchV118"],
    [192, "fullstackAuthoringBatchV119"],
    [193, "fullstackAuthoringBatchV120"],
    [194, "fullstackAuthoringBatchV121"],
    [195, "fullstackAuthoringBatchV122"],
    [196, "fullstackAuthoringBatchV123"],
    [197, "fullstackAuthoringBatchV124"],
    [198, "fullstackAuthoringBatchV125"],
    [199, "fullstackAuthoringBatchV126"],
    [200, "fullstackAuthoringBatchV127"],
    [201, "fullstackAuthoringBatchV128"],
    [202, "fullstackAuthoringBatchV129"],
    [203, "fullstackAuthoringBatchV130"],
    [204, "fullstackAuthoringBatchV131"],
    [205, "fullstackAuthoringBatchV132"],
    [206, "fullstackAuthoringBatchV133"],
    [207, "fullstackAuthoringBatchV134"],
    [208, "fullstackAuthoringBatchV135"],
    [209, "fullstackAuthoringBatchV136"],
    [210, "fullstackAuthoringBatchV137"],
    [211, "fullstackAuthoringBatchV138"],
    [212, "fullstackAuthoringBatchV139"],
    [213, "fullstackAuthoringBatchV140"],
    [214, "fullstackAuthoringBatchV141"],
    [215, "fullstackAuthoringBatchV142"],
    [216, "fullstackAuthoringBatchV143"],
    [217, "fullstackAuthoringBatchV144"],
    [218, "fullstackAuthoringBatchV145"],
    [219, "fullstackAuthoringBatchV146"],
    [220, "fullstackAuthoringBatchV147"],
    [221, "fullstackAuthoringBatchV148"],
    [222, "fullstackAuthoringBatchV149"],
    [223, "fullstackAuthoringBatchV150"],
    [224, "fullstackAuthoringBatchV151"],
    [225, "fullstackAuthoringBatchV152"],
    [226, "fullstackAuthoringBatchV153"],
    [227, "fullstackAuthoringBatchV154"],
    [228, "fullstackAuthoringBatchV155"],
    [229, "fullstackAuthoringBatchV156"],
    [230, "fullstackAuthoringBatchV157"],
    [231, "fullstackAuthoringBatchV158"],
    [232, "fullstackAuthoringBatchV159"],
    [233, "fullstackAuthoringBatchV160"],
    [234, "fullstackAuthoringBatchV161"],
    [235, "fullstackAuthoringBatchV162"],
    [236, "fullstackAuthoringBatchV163"],
    [237, "fullstackAuthoringBatchV164"],
    [238, "fullstackAuthoringBatchV165"],
    [239, "fullstackAuthoringBatchV166"],
    [240, "fullstackAuthoringBatchV167"],
    [241, "fullstackAuthoringBatchV168"],
    [242, "fullstackAuthoringBatchV169"],
    [243, "fullstackAuthoringBatchV170"],
    [244, "fullstackAuthoringBatchV171"],
    [245, "fullstackAuthoringBatchV172"],
    [246, "fullstackAuthoringBatchV173"],
    [247, "fullstackAuthoringBatchV174"],
    [248, "fullstackAuthoringBatchV175"],
    [249, "fullstackAuthoringBatchV176"],
    [250, "fullstackAuthoringBatchV177"],
    [251, "fullstackAuthoringBatchV178"],
    [252, "fullstackAuthoringBatchV179"],
    [253, "fullstackAuthoringBatchV180"],
    [254, "fullstackAuthoringBatchV181"],
    [255, "fullstackAuthoringBatchV182"],
    [256, "fullstackAuthoringBatchV183"],
    [257, "fullstackAuthoringBatchV184"],
    [258, "fullstackAuthoringBatchV185"],
    [259, "fullstackAuthoringBatchV186"],
    [260, "fullstackAuthoringBatchV187"],
    [261, "fullstackAuthoringBatchV188"],
    [262, "fullstackAuthoringBatchV189"],
    [263, "fullstackAuthoringBatchV190"],
    [264, "fullstackAuthoringBatchV191"],
    [265, "fullstackAuthoringBatchV192"],
    [266, "fullstackAuthoringBatchV193"],
    [267, "fullstackAuthoringBatchV194"],
    [268, "fullstackAuthoringBatchV195"],
    [269, "fullstackAuthoringBatchV196"],
    [270, "fullstackAuthoringBatchV197"],
    [271, "fullstackAuthoringBatchV198"],
    [272, "fullstackAuthoringBatchV199"],
    [273, "fullstackAuthoringBatchV200"],
    [274, "fullstackAuthoringBatchV201"],
    [275, "fullstackAuthoringBatchV202"],
    [276, "fullstackAuthoringBatchV203"],
    [277, "fullstackAuthoringBatchV204"],
    [278, "fullstackAuthoringBatchV205"],
    [279, "fullstackAuthoringBatchV206"],
    [280, "fullstackAuthoringBatchV207"],
    [281, "fullstackAuthoringBatchV208"],
    [282, "fullstackAuthoringBatchV209"],
    [283, "fullstackAuthoringBatchV210"],
    [284, "fullstackAuthoringBatchV211"],
    [285, "fullstackAuthoringBatchV212"],
    [286, "fullstackAuthoringBatchV213"],
    [287, "fullstackAuthoringBatchV214"],
    [288, "fullstackAuthoringBatchV215"],
    [289, "fullstackAuthoringBatchV216"],
    [290, "fullstackAuthoringBatchV217"],
    [291, "fullstackAuthoringBatchV218"],
    [292, "fullstackAuthoringBatchV219"],
    [293, "fullstackAuthoringBatchV220"],
    [294, "fullstackAuthoringBatchV221"],
    [295, "fullstackAuthoringBatchV222"],
    [296, "fullstackAuthoringBatchV223"],
    [297, "fullstackAuthoringBatchV224"],
    [298, "fullstackAuthoringBatchV225"],
    [299, "fullstackAuthoringBatchV226"],
    [300, "fullstackAuthoringBatchV227"],
    [301, "fullstackAuthoringBatchV228"],
    [302, "fullstackAuthoringBatchV229"],
    [303, "fullstackAuthoringBatchV230"],
    [304, "fullstackAuthoringBatchV231"],
    [305, "fullstackAuthoringBatchV232"],
    [306, "fullstackAuthoringBatchV233"],
    [307, "fullstackAuthoringBatchV234"],
    [308, "fullstackAuthoringBatchV235"],
    [309, "fullstackAuthoringBatchV236"],
    [310, "fullstackAuthoringBatchV237"],
    [311, "fullstackAuthoringBatchV238"],
    [312, "fullstackAuthoringBatchV239"],
    [313, "fullstackAuthoringBatchV240"],
    [314, "fullstackAuthoringBatchV241"],
    [315, "fullstackAuthoringBatchV242"],
    [316, "fullstackAuthoringBatchV243"],
    [317, "fullstackAuthoringBatchV244"],
    [318, "fullstackAuthoringBatchV245"],
    [319, "fullstackAuthoringBatchV246"],
    [320, "fullstackAuthoringBatchV247"],
    [321, "fullstackAuthoringBatchV248"],
    [322, "fullstackAuthoringBatchV249"],
    [323, "fullstackAuthoringBatchV250"],
    [324, "fullstackAuthoringBatchV251"],
    [325, "fullstackAuthoringBatchV252"],
    [326, "fullstackAuthoringBatchV253"],
    [327, "fullstackAuthoringBatchV254"],
    [328, "fullstackAuthoringBatchV255"],
    [329, "fullstackAuthoringBatchV256"],
    [330, "fullstackAuthoringBatchV257"],
    [331, "fullstackAuthoringBatchV258"],
    [332, "fullstackAuthoringBatchV259"],
    [333, "fullstackAuthoringBatchV260"],
    [334, "fullstackAuthoringBatchV261"],
    [335, "fullstackAuthoringBatchV262"],
    [336, "fullstackAuthoringBatchV263"],
    [337, "fullstackAuthoringBatchV264"],
    [338, "fullstackAuthoringBatchV265"],
    [339, "fullstackAuthoringBatchV266"],
    [340, "fullstackAuthoringBatchV267"],
    [341, "fullstackAuthoringBatchV268"],
    [342, "fullstackAuthoringBatchV269"],
    [343, "fullstackAuthoringBatchV270"],
    [344, "fullstackAuthoringBatchV271"],
    [345, "fullstackAuthoringBatchV272"],
    [346, "fullstackAuthoringBatchV273"],
    [347, "fullstackAuthoringBatchV274"],
    [348, "fullstackAuthoringBatchV275"],
    [349, "fullstackAuthoringBatchV276"],
    [350, "fullstackAuthoringBatchV277"],
    [351, "fullstackAuthoringBatchV278"],
    [352, "fullstackAuthoringBatchV279"],
    [353, "fullstackAuthoringBatchV280"],
    [354, "fullstackAuthoringBatchV281"],
    [355, "fullstackAuthoringBatchV282"],
    [356, "fullstackAuthoringBatchV283"],
    [357, "fullstackAuthoringBatchV284"],
    [358, "fullstackAuthoringBatchV285"],
    [359, "fullstackAuthoringBatchV286"],
    [360, "fullstackAuthoringBatchV287"],
    [361, "fullstackAuthoringBatchV288"],
    [362, "fullstackAuthoringBatchV289"],
    [363, "fullstackAuthoringBatchV290"],
    [364, "fullstackAuthoringBatchV291"],
    [365, "fullstackAuthoringBatchV292"],
    [366, "fullstackAuthoringBatchV293"],
    [367, "fullstackAuthoringBatchV294"],
    [368, "fullstackAuthoringBatchV295"],
    [369, "fullstackAuthoringBatchV296"],
    [370, "fullstackAuthoringBatchV297"],
    [371, "fullstackAuthoringBatchV298"],
    [372, "fullstackAuthoringBatchV299"],
    [373, "fullstackAuthoringBatchV300"],
    [374, "fullstackAuthoringBatchV301"],
    [375, "fullstackAuthoringBatchV302"],
    [376, "fullstackAuthoringBatchV303"],
    [377, "fullstackAuthoringBatchV304"],
    [378, "fullstackAuthoringBatchV305"],
    [379, "fullstackAuthoringBatchV306"],
    [380, "fullstackAuthoringBatchV307"],
    [381, "fullstackAuthoringBatchV308"],
    [382, "fullstackAuthoringBatchV309"],
    [383, "fullstackAuthoringBatchV310"],
    [384, "fullstackAuthoringBatchV311"],
    [385, "fullstackAuthoringBatchV312"],
    [386, "fullstackAuthoringBatchV313"],
    [387, "fullstackAuthoringBatchV314"],
    [388, "fullstackAuthoringBatchV315"],
    [389, "fullstackAuthoringBatchV316"],
    [390, "fullstackAuthoringBatchV317"],
    [391, "fullstackAuthoringBatchV318"],
    [392, "fullstackAuthoringBatchV319"],
    [393, "fullstackAuthoringBatchV320"],
    [394, "fullstackAuthoringBatchV321"],
    [395, "fullstackAuthoringBatchV322"],
    [396, "fullstackAuthoringBatchV323"],
    [397, "fullstackAuthoringBatchV324"],
    [398, "fullstackAuthoringBatchV325"],
    [399, "fullstackAuthoringBatchV326"],
    [400, "fullstackAuthoringBatchV327"],
    [401, "fullstackAuthoringBatchV328"],
    [402, "fullstackAuthoringBatchV329"],
    [403, "fullstackAuthoringBatchV330"],
    [404, "fullstackAuthoringBatchV331"],
    [405, "fullstackAuthoringBatchV332"],
    [406, "fullstackAuthoringBatchV333"],
    [407, "fullstackAuthoringBatchV334"],
    [408, "fullstackAuthoringBatchV335"],
    [409, "fullstackAuthoringBatchV336"],
    [410, "fullstackAuthoringBatchV337"],
    [411, "fullstackAuthoringBatchV338"],
    [412, "fullstackAuthoringBatchV339"],
    [413, "fullstackAuthoringBatchV340"],
    [414, "fullstackAuthoringBatchV341"],
    [415, "fullstackAuthoringBatchV342"],
    [416, "fullstackAuthoringBatchV343"],
    [417, "fullstackAuthoringBatchV344"],
    [418, "fullstackAuthoringBatchV345"],
    [419, "fullstackAuthoringBatchV346"],
    [420, "fullstackAuthoringBatchV347"],
    [421, "fullstackAuthoringBatchV348"],
    [422, "fullstackAuthoringBatchV349"],
    [423, "fullstackAuthoringBatchV350"],
    [424, "fullstackAuthoringBatchV351"],
    [425, "fullstackAuthoringBatchV352"],
    [426, "fullstackAuthoringBatchV353"],
    [427, "fullstackAuthoringBatchV354"],
    [428, "fullstackAuthoringBatchV355"],
    [429, "fullstackAuthoringBatchV356"],
    [430, "fullstackAuthoringBatchV357"],
    [431, "fullstackAuthoringBatchV358"],
    [432, "fullstackAuthoringBatchV359"],
    [433, "fullstackAuthoringBatchV360"],
    [434, "fullstackAuthoringBatchV361"],
    [435, "fullstackAuthoringBatchV362"],
    [436, "fullstackAuthoringBatchV363"],
    [437, "fullstackAuthoringBatchV364"],
    [438, "fullstackAuthoringBatchV365"],
    [439, "fullstackAuthoringBatchV366"],
    [440, "fullstackAuthoringBatchV367"],
    [441, "fullstackAuthoringBatchV368"],
    [442, "fullstackAuthoringBatchV369"],
    [443, "fullstackAuthoringBatchV370"],
    [444, "fullstackAuthoringBatchV371"],
    [445, "fullstackAuthoringBatchV372"],
    [446, "fullstackAuthoringBatchV373"],
    [447, "fullstackAuthoringBatchV374"],
    [448, "fullstackAuthoringBatchV375"],
    [449, "fullstackAuthoringBatchV376"],
    [450, "fullstackAuthoringBatchV377"],
    [451, "fullstackAuthoringBatchV378"],
    [452, "fullstackAuthoringBatchV379"],
    [453, "fullstackAuthoringBatchV380"],
    [454, "fullstackAuthoringBatchV381"],
    [455, "fullstackAuthoringBatchV382"],
    [456, "fullstackAuthoringBatchV383"],
    [457, "fullstackAuthoringBatchV384"],
    [458, "fullstackAuthoringBatchV385"],
    [459, "fullstackAuthoringBatchV386"],
    [460, "fullstackAuthoringBatchV387"],
    [461, "fullstackAuthoringBatchV388"],
    [462, "fullstackAuthoringBatchV389"],
    [463, "fullstackAuthoringBatchV390"],
    [464, "fullstackAuthoringBatchV391"],
    [465, "fullstackAuthoringBatchV392"],
    [466, "fullstackAuthoringBatchV393"],
    [467, "fullstackAuthoringBatchV394"],
    [468, "fullstackAuthoringBatchV395"],
    [469, "fullstackAuthoringBatchV396"],
    [470, "fullstackAuthoringBatchV397"],
    [471, "fullstackAuthoringBatchV398"],
    [472, "fullstackAuthoringBatchV399"],
    [473, "fullstackAuthoringBatchV400"],
    [474, "fullstackAuthoringBatchV401"],
    [475, "fullstackAuthoringBatchV402"],
    [476, "fullstackAuthoringBatchV403"],
    [477, "fullstackAuthoringBatchV404"],
    [478, "fullstackAuthoringBatchV405"],
    [479, "fullstackAuthoringBatchV406"],
    [480, "fullstackAuthoringBatchV407"],
    [481, "fullstackAuthoringBatchV408"],
    [482, "fullstackAuthoringBatchV409"],
    [483, "fullstackAuthoringBatchV410"],
    [484, "fullstackAuthoringBatchV411"],
    [485, "fullstackAuthoringBatchV412"],
    [486, "fullstackAuthoringBatchV413"],
    [487, "fullstackAuthoringBatchV414"],
    [488, "fullstackAuthoringBatchV415"],
    [489, "fullstackAuthoringBatchV416"],
    [490, "fullstackAuthoringBatchV417"],
    [491, "fullstackAuthoringBatchV418"],
    [492, "fullstackAuthoringBatchV419"],
    [493, "fullstackAuthoringBatchV420"],
    [494, "fullstackAuthoringBatchV421"],
    [495, "fullstackAuthoringBatchV422"],
    [496, "fullstackAuthoringBatchV423"],
    [497, "fullstackAuthoringBatchV424"],
    [498, "fullstackAuthoringBatchV425"],
    [499, "fullstackAuthoringBatchV426"],
    [500, "fullstackAuthoringBatchV427"],
    [501, "fullstackAuthoringBatchV428"],
    [502, "fullstackAuthoringBatchV429"],
    [503, "fullstackAuthoringBatchV430"],
    [504, "fullstackAuthoringBatchV431"],
    [505, "fullstackAuthoringBatchV432"],
    [506, "fullstackAuthoringBatchV433"],
    [507, "fullstackAuthoringBatchV434"],
    [508, "fullstackAuthoringBatchV435"],
    [509, "fullstackAuthoringBatchV436"],
    [510, "fullstackAuthoringBatchV437"],
    [511, "phase2MigrationOs"],
    [512, "phase8ProductProof"],
  ]) {
    if (s.schemaVersion >= ver) {
      if (s[key]?.ok !== true) {
        fail(`${label}: ${key}.ok must be true for schema v${ver}`);
      }
      if (!s[key]?.script) {
        fail(`${label}: ${key}.script must be set for schema v${ver}`);
      }
    }
  }
  const g = s.routeGrades;
  if (!g || typeof g.gold !== "number" || typeof g.silver !== "number" || typeof g.open !== "number") {
    fail(`${label}: missing routeGrades counts`);
  }
  console.log(`${label} OK: gold=${g.gold} silver=${g.silver} open=${g.open} matrixPassed=${s.matrixSmoke?.passed}`);
}


export { assertHubCompletion };
