import { NgModule } from "@angular/core";
import { LoginComponent } from "./login.component";
import { LoginLogger } from "./login.logger";
import { FeatureAudit } from "./feature-audit.service";

/** Login feature module — NgModule providers for G9945. */
@NgModule({
  declarations: [LoginComponent],
  providers: [LoginLogger, FeatureAudit],
})
export class LoginModule {}
