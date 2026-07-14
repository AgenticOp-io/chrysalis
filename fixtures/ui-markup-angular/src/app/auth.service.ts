import { Injectable, inject } from "@angular/core";
import { of } from "rxjs";
import { SessionStore } from "./session.store";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly session = inject(SessionStore);
  readonly status$ = of("ready");
  signIn(): void {
    void this.session.token$;
  }
}
