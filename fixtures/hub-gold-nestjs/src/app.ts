import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";

// hub-gold-nestjs — 20-route NestJS TypeScript origin dialect (secondary to Express/TS ST).
// Mirrors hub-flagship-express route set via @Controller + @Get/@Post/… (+ path join + @Param/@Query).
// No Nest DI / modules / guards / pipes invented (**D6447**).

@Controller()
export class AppController {
  @Get("health")
  health() {
    return true;
  }

  @Get("ping")
  ping() {
    return 42;
  }

  @Get("version")
  version() {
    return 1;
  }

  @Get("ready")
  ready() {
    return "ok";
  }

  @Get("count")
  count() {
    return 3;
  }

  @Get("flag")
  flag() {
    return "chrysalis";
  }

  @Get("build")
  build() {
    return 2026;
  }

  @Get("tier")
  tier() {
    return "gold";
  }

  @Get("meta")
  meta() {
    return { service: "hub-gold-nestjs", version: 1 };
  }

  @Post("echo")
  echo() {
    return { echo: true };
  }

  @Get("search")
  search(@Query("q") q: string) {
    return { q: q ?? "" };
  }

  @Get("users/:userId")
  user(@Param("userId") userId: string) {
    return userId;
  }

  @Get("stats")
  stats() {
    return 3;
  }

  @Post("notify")
  @HttpCode(202)
  notify() {
    return { ok: true };
  }
}

@Controller("items")
export class ItemsController {
  @Get()
  list() {
    return true;
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return { id };
  }

  @Post()
  @HttpCode(201)
  create() {
    return { created: true };
  }

  @Put(":id")
  update(@Param("id") id: string) {
    return { updated: true, id };
  }

  @Delete(":id")
  remove() {
    return true;
  }

  @Patch(":id")
  patch(@Param("id") id: string) {
    return { patched: true, id };
  }
}
