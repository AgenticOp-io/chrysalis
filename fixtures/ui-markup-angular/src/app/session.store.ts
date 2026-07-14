import { Injectable, inject } from "@angular/core";
import { of } from "rxjs";

/** Second-hop DI node for G9931 graph smoke. */
@Injectable({ providedIn: "root" })
export class SessionStore {
  readonly token$ = of<string | null>(null);
}
