import { Injectable } from "@angular/core";

/** Component-scoped provider (no providedIn) for G9941. */
@Injectable()
export class LoginLogger {
  log(msg: string): void {
    void msg;
  }
}
