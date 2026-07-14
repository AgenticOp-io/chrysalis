import { Component, inject } from "@angular/core";
import { AuthService } from "../auth.service";
import { LoginLogger } from "./login.logger";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  providers: [LoginLogger],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoginLogger);
  title = "Angular Sign in";
  showHint = true;
  items: { label: string }[] = [];
  busy = false;
  status$ = this.auth.status$;

  onSubmit(): void {
    this.logger.log("sign-in");
    this.auth.signIn();
  }
}
