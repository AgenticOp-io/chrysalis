import { Component } from "@angular/core";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent {
  title = "Angular Dashboard";
  showFilters = false;
  showUpgradeModal = false;
  rows: { name: string }[] = [];
}
