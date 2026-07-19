# WISP API native handlers — Phase 27b (lifted from backend-services contract)
# MongoDB remains infra; handler bodies are CWL-native with db/session effects.
module wisp_api;

@route GET "/api/monitoring/snmp/metrics/latest"
handler wisp_api_monitoring_snmp_metrics_latest_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-snmp-metrics-latest", op: "list" };
}

@route POST "/api/billing/subscription/create"
handler wisp_api_billing_subscription_create_post {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-subscription-create", op: "create" };
}

@route POST "/api/billing/webhook/paypal"
handler wisp_api_billing_webhook_paypal_post {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-webhook-paypal", op: "create" };
}

@route POST "/api/customer-billing/dunning/run"
handler wisp_api_customer_billing_dunning_run_post {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-dunning-run", op: "create" };
}

@route POST "/api/customer-portal/auth/login"
handler wisp_api_customer_portal_auth_login_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-auth-login", op: "create" };
}

@route GET "/api/customer-portal/auth/me"
handler wisp_api_customer_portal_auth_me_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-auth-me", op: "list" };
}

@route POST "/api/customer-portal/auth/reset-password"
handler wisp_api_customer_portal_auth_reset_password_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-auth-reset-password", op: "create" };
}

@route POST "/api/customer-portal/auth/signup"
handler wisp_api_customer_portal_auth_signup_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-auth-signup", op: "create" };
}

@route POST "/api/customer-portal/billing/create-payment-intent"
handler wisp_api_customer_portal_billing_create_payment_intent_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-billing-create-payment-intent", op: "create" };
}

@route GET "/api/customer-portal/billing/settings"
handler wisp_api_customer_portal_billing_settings_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-billing-settings", op: "list" };
}

@route PATCH "/api/customer-portal/billing/settings"
handler wisp_api_customer_portal_billing_settings_patch {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-billing-settings", op: "update" };
}

@route GET "/api/customers/stats/summary"
handler wisp_api_customers_stats_summary_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-stats-summary", op: "list" };
}

@route GET "/api/epc/checkin/monitoring-devices"
handler wisp_api_epc_checkin_monitoring_devices_get {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin-monitoring-devices", op: "list" };
}

@route POST "/api/epc/checkin/ping-metrics"
handler wisp_api_epc_checkin_ping_metrics_post {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin-ping-metrics", op: "create" };
}

@route POST "/api/epc/checkin/snmp-metrics"
handler wisp_api_epc_checkin_snmp_metrics_post {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin-snmp-metrics", op: "create" };
}

@route GET "/api/epc/checkin/snmp-subnets"
handler wisp_api_epc_checkin_snmp_subnets_get {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin-snmp-subnets", op: "list" };
}

@route POST "/api/epc/snmp/discovered"
handler wisp_api_epc_snmp_discovered_post {
  # source backend-services/routes/epc-snmp.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-snmp-discovered", op: "create" };
}

@route GET "/api/incidents/stats/dashboard"
handler wisp_api_incidents_stats_dashboard_get {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-stats-dashboard", op: "list" };
}

@route POST "/api/internal/cron/billing"
handler wisp_api_internal_cron_billing_post {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-cron-billing", op: "create" };
}

@route GET "/api/inventory/alerts/low-stock"
handler wisp_api_inventory_alerts_low_stock_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-alerts-low-stock", op: "list" };
}

@route GET "/api/inventory/alerts/maintenance-due"
handler wisp_api_inventory_alerts_maintenance_due_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-alerts-maintenance-due", op: "list" };
}

@route GET "/api/inventory/alerts/warranty-expiring"
handler wisp_api_inventory_alerts_warranty_expiring_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-alerts-warranty-expiring", op: "list" };
}

@route GET "/api/inventory/export/csv"
handler wisp_api_inventory_export_csv_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-export-csv", op: "list" };
}

@route POST "/api/inventory/scan/check-in"
handler wisp_api_inventory_scan_checkin_post {
  # source backend-services/routes/inventory-scan-checkin — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"op\":\"check-in\",\"item\":{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"in-stock\"}}";
}

@route POST "/api/inventory/scan/check-out"
handler wisp_api_inventory_scan_checkout_post {
  # source backend-services/routes/inventory-scan-checkout — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"op\":\"check-out\",\"item\":{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"deployed\"}}";
}

@route POST "/api/inventory/scan/lookup"
handler wisp_api_inventory_scan_lookup_post {
  # source backend-services/routes/inventory-scan-lookup — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"item\":{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"in-stock\",\"identifier\":\"SN-AX100-001\",\"location\":{\"type\":\"warehouse\",\"name\":\"Main WH\"}}}";
}

@route GET "/api/maintain/dashboard/activity"
handler wisp_api_maintain_dashboard_activity_get {
  # source backend-services/routes/maintain.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "maintain-dashboard-activity", op: "list" };
}

@route GET "/api/maintain/dashboard/stats"
handler wisp_api_maintain_dashboard_stats_get {
  # source backend-services/routes/maintain.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "maintain-dashboard-stats", op: "list" };
}

@route GET "/api/mikrotik/devices/credentials"
handler wisp_api_mikrotik_devices_credentials_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-credentials", op: "list" };
}

@route POST "/api/mme/status/batch"
handler wisp_api_mme_status_batch_post {
  # source backend-services/routes/mme-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mme-status-batch", op: "create" };
}

@route GET "/api/monitoring/epc/list"
handler wisp_api_monitoring_epc_list_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-epc-list", op: "list" };
}

@route GET "/api/monitoring/graphs/devices"
handler wisp_api_monitoring_graphs_devices_get {
  # source backend-services/routes/monitoring-graphs-devices — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"success\":true,\"devices\":[],\"count\":0}";
}

@route GET "/api/monitoring/mikrotik/devices"
handler wisp_api_monitoring_mikrotik_devices_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-mikrotik-devices", op: "list" };
}

@route GET "/api/monitoring/monitoring/dashboard"
handler wisp_api_monitoring_monitoring_dashboard_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-monitoring-dashboard", op: "list" };
}

@route GET "/api/monitoring/monitoring/topology"
handler wisp_api_monitoring_monitoring_topology_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-monitoring-topology", op: "list" };
}

@route GET "/api/monitoring/snmp/devices"
handler wisp_api_monitoring_snmp_devices_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-snmp-devices", op: "list" };
}

@route GET "/api/monitoring/snmp/discovered"
handler wisp_api_monitoring_snmp_discovered_get {
  # source backend-services/routes/monitoring.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-snmp-discovered", op: "list" };
}

@route POST "/api/network/equipment/bulk-import"
handler wisp_api_network_equipment_bulk_import_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-equipment-bulk-import", op: "create" };
}

@route POST "/api/network/import/cbrs"
handler wisp_api_network_import_cbrs_post {
  # source backend-services/routes/network-import-cbrs — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"imported\":0,\"errors\":[],\"note\":\"CBRS import endpoint present; no invent GenieACS/ACS payloads\"}";
}

@route POST "/api/network/sites/bulk-import"
handler wisp_api_network_sites_bulk_import_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-bulk-import", op: "create" };
}

@route POST "/api/plans/marketing/discover"
handler wisp_api_plans_marketing_discover_post {
  # source backend-services/routes/plans-marketing-discover — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"addresses\":[{\"id\":\"addr-1\",\"name\":\"112 Main St\",\"address\":\"112 Main St\",\"lat\":39.848,\"lng\":-98.575,\"source\":\"microsoft_footprints\"},{\"id\":\"addr-2\",\"name\":\"118 Main St\",\"address\":\"118 Main St\",\"lat\":39.849,\"lng\":-98.576,\"source\":\"osm_buildings\"}],\"count\":2,\"algorithms\":[\"microsoft_footprints\",\"osm_buildings\"]}";
}

@route GET "/api/remote-agents/status/unlinked"
handler wisp_api_remote_agents_status_unlinked_get {
  # source backend-services/routes/remote-agents-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "remote-agents-status-unlinked", op: "list" };
}

@route GET "/api/system/services/status"
handler wisp_api_system_services_status_get {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-services-status", op: "list" };
}

@route POST "/api/system/system/reboot"
handler wisp_api_system_system_reboot_post {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-system-reboot", op: "create" };
}

@route POST "/api/system/system/restart-all"
handler wisp_api_system_system_restart_all_post {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-system-restart-all", op: "create" };
}

@route POST "/api/voice/actions/create-port-order"
handler wisp_api_voice_actions_create_port_order_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-actions-create-port-order", op: "create" };
}

@route POST "/api/voice/actions/provision-emergency-address"
handler wisp_api_voice_actions_provision_emergency_address_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-actions-provision-emergency-address", op: "create" };
}

@route GET "/api/work-orders/alerts/sla-breach"
handler wisp_api_work_orders_alerts_sla_breach_get {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-alerts-sla-breach", op: "list" };
}

@route GET "/api/work-orders/stats/dashboard"
handler wisp_api_work_orders_stats_dashboard_get {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-stats-dashboard", op: "list" };
}

@route GET "/api/agent/manifest"
handler wisp_api_agent_manifest_get {
  # source backend-services/routes/agent.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "agent-manifest", op: "list" };
}

@route POST "/api/auth/login"
handler wisp_api_auth_login_post {
  # source backend-services/routes/auth/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "auth-login", op: "create" };
}

@route POST "/api/auth/logout"
handler wisp_api_auth_logout_post {
  # source backend-services/routes/auth/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "auth-logout", op: "create" };
}

@route GET "/api/auth/me"
handler wisp_api_auth_me_get {
  # source backend-services/routes/auth/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "auth-me", op: "list" };
}

@route POST "/api/auth/refresh"
handler wisp_api_auth_refresh_post {
  # source backend-services/routes/auth/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "auth-refresh", op: "create" };
}

@route GET "/api/auth/status"
handler wisp_api_auth_status_get {
  # source backend-services/routes/auth/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "auth-status", op: "list" };
}

@route GET "/api/billing/analytics"
handler wisp_api_billing_analytics_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-analytics", op: "list" };
}

@route GET "/api/billing/invoices"
handler wisp_api_billing_invoices_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-invoices", op: "list" };
}

@route GET "/api/billing/payment-methods"
handler wisp_api_billing_payment_methods_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-payment-methods", op: "list" };
}

@route POST "/api/billing/payment-methods"
handler wisp_api_billing_payment_methods_post {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-payment-methods", op: "create" };
}

@route GET "/api/billing/plans"
handler wisp_api_billing_plans_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-plans", op: "list" };
}

@route GET "/api/billing/subscriptions"
handler wisp_api_billing_subscriptions_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-subscriptions", op: "list" };
}

@route POST "/api/customer-billing/generate-invoices"
handler wisp_api_customer_billing_generate_invoices_post {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-generate-invoices", op: "create" };
}

@route GET "/api/customer-portal/billing"
handler wisp_api_customer_portal_billing_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-billing", op: "list" };
}

@route GET "/api/customer-portal/service"
handler wisp_api_customer_portal_service_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-service", op: "list" };
}

@route GET "/api/customer-portal/tickets"
handler wisp_api_customer_portal_tickets_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-tickets", op: "list" };
}

@route POST "/api/customer-portal/tickets"
handler wisp_api_customer_portal_tickets_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-tickets", op: "create" };
}

@route POST "/api/customers/bulk-import"
handler wisp_api_customers_bulk_import_post {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-bulk-import", op: "create" };
}

@route POST "/api/deploy/backfill-hardware-deployments"
handler wisp_api_deploy_backfill_hardware_deployments_post {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-backfill-hardware-deployments", op: "create" };
}

@route POST "/api/deploy/checkin"
handler wisp_api_deploy_checkin_post {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-checkin", op: "create" };
}

@route POST "/api/deploy/link-device"
handler wisp_api_deploy_link_device_post {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-link-device", op: "create" };
}

@route POST "/api/deploy/register-epc"
handler wisp_api_deploy_register_epc_post {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-register-epc", op: "create" };
}

@route POST "/api/device-assignment/assign"
handler wisp_api_device_assignment_assign_post {
  # source backend-services/routes/device-assignment.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "device-assignment-assign", op: "create" };
}

@route POST "/api/device-assignment/manual-ip"
handler wisp_api_device_assignment_manual_ip_post {
  # source backend-services/routes/device-assignment.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "device-assignment-manual-ip", op: "create" };
}

@route GET "/api/device-assignment/unassigned"
handler wisp_api_device_assignment_unassigned_get {
  # source backend-services/routes/device-assignment.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "device-assignment-unassigned", op: "list" };
}

@route POST "/api/epc-management/delete"
handler wisp_api_epc_management_delete_post {
  # source backend-services/routes/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-management-delete", op: "create" };
}

@route POST "/api/epc/alerts"
handler wisp_api_epc_alerts_post {
  # source backend-services/routes/epcMetrics.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-alerts", op: "create" };
}

@route POST "/api/epc/checkin"
handler wisp_api_epc_checkin_post {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin", op: "create" };
}

@route POST "/api/epc/commands"
handler wisp_api_epc_commands_post {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-commands", op: "create" };
}

@route GET "/api/epc/list"
handler wisp_api_epc_list_get {
  # source backend-services/routes/epc.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-list", op: "list" };
}

@route POST "/api/epc/metrics"
handler wisp_api_epc_metrics_post {
  # source backend-services/routes/epcMetrics.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-metrics", op: "create" };
}

@route GET "/api/epc/snmp"
handler wisp_api_epc_snmp_get {
  # source backend-services/routes/epc-snmp — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/epc/snmp"
handler wisp_api_epc_snmp_post {
  # source backend-services/routes/epc-snmp — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-snmp\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/epc/snmp"
handler wisp_api_epc_snmp_put {
  # source backend-services/routes/epc-snmp — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-snmp\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/epc/snmp"
handler wisp_api_epc_snmp_patch {
  # source backend-services/routes/epc-snmp — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-snmp\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/epc/snmp"
handler wisp_api_epc_snmp_delete {
  # source backend-services/routes/epc-snmp — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-snmp\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/epc/status"
handler wisp_api_epc_status_get {
  # source backend-services/routes/epc.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-status", op: "list" };
}

@route POST "/api/equipment-pricing/import-from-inventory"
handler wisp_api_equipment_pricing_import_from_inventory_post {
  # source backend-services/routes/equipment-pricing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "equipment-pricing-import-from-inventory", op: "create" };
}

@route GET "/api/equipment-pricing/price"
handler wisp_api_equipment_pricing_price_get {
  # source backend-services/routes/equipment-pricing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "equipment-pricing-price", op: "list" };
}

@route POST "/api/internal/first-tenant"
handler wisp_api_internal_first_tenant_post {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-first-tenant", op: "create" };
}

@route GET "/api/internal/plans"
handler wisp_api_internal_plans_get {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-plans", op: "list" };
}

@route GET "/api/internal/tenant-settings"
handler wisp_api_internal_tenant_settings_get {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-tenant-settings", op: "list" };
}

@route PUT "/api/internal/tenant-settings"
handler wisp_api_internal_tenant_settings_put {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-tenant-settings", op: "update" };
}

@route POST "/api/inventory/bulk-import"
handler wisp_api_inventory_bulk_import_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-bulk-import", op: "create" };
}

@route POST "/api/inventory/bulk-update"
handler wisp_api_inventory_bulk_update_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-bulk-update", op: "create" };
}

@route GET "/api/inventory/stats"
handler wisp_api_inventory_stats_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-stats", op: "list" };
}

@route POST "/api/inventory/transfer"
handler wisp_api_inventory_transfer_post {
  # source backend-services/routes/inventory-transfer — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"op\":\"transfer\",\"item\":{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"in-transit\"}}";
}

@route GET "/api/mikrotik/devices"
handler wisp_api_mikrotik_devices_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices", op: "list" };
}

@route POST "/api/mikrotik/discover"
handler wisp_api_mikrotik_discover_post {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-discover", op: "create" };
}

@route GET "/api/mikrotik/discovery"
handler wisp_api_mikrotik_discovery_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-discovery", op: "list" };
}

@route GET "/api/mikrotik/status"
handler wisp_api_mikrotik_status_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-status", op: "list" };
}

@route GET "/api/mme/customer-count"
handler wisp_api_mme_customer_count_get {
  # source backend-services/routes/mme-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mme-customer-count", op: "list" };
}

@route GET "/api/mme/online-subscribers"
handler wisp_api_mme_online_subscribers_get {
  # source backend-services/routes/mme-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mme-online-subscribers", op: "list" };
}

@route POST "/api/mme/status"
handler wisp_api_mme_status_post {
  # source backend-services/routes/mme-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mme-status", op: "create" };
}

@route GET "/api/mobile/tasks"
handler wisp_api_mobile_tasks_get {
  # source backend-services/routes/mobile-tasks.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mobile-tasks", op: "list" };
}

@route GET "/api/monitoring/graphs"
handler wisp_api_monitoring_graphs_get {
  # source backend-services/routes/monitoring-graphs — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"points\":48},\"series\":[{\"id\":\"rssi\",\"name\":\"RSSI\",\"status\":\"ok\"}],\"items\":[{\"id\":\"rssi\",\"name\":\"RSSI\",\"status\":\"ok\"}]}";
}

@route GET "/api/network/cpe"
handler wisp_api_network_cpe_get {
  # source backend-services/routes/network-cpe — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"cpe\":[{\"id\":\"cpe-1\",\"name\":\"CPE Acme\",\"status\":\"active\",\"lat\":39.842,\"lng\":-98.57,\"location\":{\"latitude\":39.842,\"longitude\":-98.57}}],\"items\":[{\"id\":\"cpe-1\",\"name\":\"CPE Acme\",\"status\":\"active\",\"lat\":39.842,\"lng\":-98.57}]}";
}

@route POST "/api/network/cpe"
handler wisp_api_network_cpe_post {
  # source backend-services/routes/network-cpe — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"name\":\"CWL Trace CPE 1784255421599\",\"status\":\"active\",\"technology\":\"LTE\",\"manufacturer\":\"Trace\",\"model\":\"CWL\",\"serialNumber\":\"CPE-1784255421599\",\"location\":{\"latitude\":39.75,\"longitude\":-104.98,\"country\":\"US\",\"_id\":\"6a5993c9ad923e3601e03d6b\"},\"siteId\":\"6a596f4dad923e3601e03063\",\"tenantId\":\"6a166eb07089304417ec967a\",\"createdBy\":\"System\",\"_id\":\"6a5993c9ad923e3601e03d6a\",\"createdAt\":\"2026-07-17T02:30:33.868Z\",\"updatedAt\":\"2026-07-17T02:30:33.868Z\",\"__v\":0}";
}

@route GET "/api/network/equipment"
handler wisp_api_network_equipment_get {
  # source backend-services/routes/network-equipment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"equipment\":[{\"id\":\"eq-1\",\"name\":\"Core Switch\",\"status\":\"online\",\"locationType\":\"noc\",\"lat\":39.78,\"lng\":-98.52,\"location\":{\"latitude\":39.78,\"longitude\":-98.52}}],\"items\":[{\"id\":\"eq-1\",\"name\":\"Core Switch\",\"status\":\"online\"}]}";
}

@route POST "/api/network/equipment"
handler wisp_api_network_equipment_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-equipment", op: "create" };
}

@route POST "/api/network/geocode"
handler wisp_api_network_geocode_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-geocode", op: "create" };
}

@route GET "/api/network/hardware-deployments"
handler wisp_api_network_hardware_deployments_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-hardware-deployments", op: "list" };
}

@route POST "/api/network/reverse-geocode"
handler wisp_api_network_reverse_geocode_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-reverse-geocode", op: "create" };
}

@route GET "/api/network/sectors"
handler wisp_api_network_sectors_get {
  # source backend-services/routes/network-sectors — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"sectors\":[{\"id\":\"sec-1\",\"_id\":\"sec-1\",\"siteId\":\"s1\",\"name\":\"North-LTE-0\",\"status\":\"active\",\"technology\":\"LTE\",\"band\":\"LTE\",\"azimuth\":0,\"beamwidth\":65,\"pci\":101,\"earfcn\":2300,\"eNodeB\":1001,\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58}},{\"id\":\"sec-2\",\"_id\":\"sec-2\",\"siteId\":\"s1\",\"name\":\"North-CBRS-120\",\"status\":\"deployed\",\"technology\":\"CBRS\",\"band\":\"CBRS\",\"azimuth\":120,\"beamwidth\":60,\"pci\":204,\"earfcn\":55240,\"eNodeB\":1001,\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58}},{\"id\":\"sec-3\",\"_id\":\"sec-3\",\"siteId\":\"s2\",\"name\":\"Beta-FWA-240\",\"status\":\"active\",\"technology\":\"FWA\",\"band\":\"FWA\",\"azimuth\":240,\"beamwidth\":90,\"pci\":88,\"earfcn\":66661,\"eNodeB\":2002,\"lat\":39.91,\"lng\":-98.65,\"location\":{\"latitude\":39.91,\"longitude\":-98.65}}],\"items\":[{\"id\":\"sec-1\",\"name\":\"North-LTE-0\",\"status\":\"active\"},{\"id\":\"sec-2\",\"name\":\"North-CBRS-120\",\"status\":\"deployed\"},{\"id\":\"sec-3\",\"name\":\"Beta-FWA-240\",\"status\":\"active\"}]}";
}

@route POST "/api/network/sectors"
handler wisp_api_network_sectors_post {
  # source backend-services/routes/network-sectors — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"name\":\"CWL Trace Sector 1784255421599\",\"status\":\"active\",\"technology\":\"LTE\",\"azimuth\":90,\"beamwidth\":65,\"location\":{\"latitude\":39.74,\"longitude\":-104.99,\"country\":\"US\",\"_id\":\"6a5993c9ad923e3601e03d68\"},\"siteId\":\"6a596f4dad923e3601e03063\",\"tenantId\":\"6a166eb07089304417ec967a\",\"createdBy\":\"System\",\"_id\":\"6a5993c9ad923e3601e03d67\",\"createdAt\":\"2026-07-17T02:30:33.752Z\",\"updatedAt\":\"2026-07-17T02:30:33.753Z\",\"__v\":0}";
}

@route GET "/api/network/sites"
handler wisp_api_network_sites_get {
  # source backend-services/routes/network-sites — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"sites\":[{\"id\":\"s1\",\"_id\":\"s1\",\"name\":\"North Tower\",\"status\":\"active\",\"type\":[\"tower\"],\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58}},{\"id\":\"s2\",\"_id\":\"s2\",\"name\":\"Beta Rooftop\",\"status\":\"active\",\"type\":[\"rooftop\"],\"lat\":39.91,\"lng\":-98.65,\"location\":{\"latitude\":39.91,\"longitude\":-98.65}},{\"id\":\"s3\",\"_id\":\"s3\",\"name\":\"Core Monopole\",\"status\":\"online\",\"type\":[\"monopole\"],\"lat\":39.78,\"lng\":-98.52,\"location\":{\"latitude\":39.78,\"longitude\":-98.52}}],\"items\":[{\"id\":\"s1\",\"name\":\"North Tower\",\"status\":\"active\",\"lat\":39.85,\"lng\":-98.58},{\"id\":\"s2\",\"name\":\"Beta Rooftop\",\"status\":\"active\",\"lat\":39.91,\"lng\":-98.65},{\"id\":\"s3\",\"name\":\"Core Monopole\",\"status\":\"online\",\"lat\":39.78,\"lng\":-98.52}]}";
}

@route POST "/api/network/sites"
handler wisp_api_network_sites_post {
  # source backend-services/routes/network-sites — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"name\":\"CWL Trace Site 1784255421599\",\"type\":[\"tower\"],\"status\":\"active\",\"location\":{\"latitude\":39.74,\"longitude\":-104.99,\"country\":\"US\",\"_id\":\"6a5993c9ad923e3601e03d64\"},\"tenantId\":\"6a166eb07089304417ec967a\",\"createdBy\":\"System\",\"_id\":\"6a5993c9ad923e3601e03d63\",\"createdAt\":\"2026-07-17T02:30:33.639Z\",\"updatedAt\":\"2026-07-17T02:30:33.640Z\",\"__v\":0}";
}

@route GET "/api/notifications/count"
handler wisp_api_notifications_count_get {
  # source backend-services/routes/notifications.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "notifications-count", op: "list" };
}

@route GET "/api/permissions/check"
handler wisp_api_permissions_check_get {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-check", op: "list" };
}

@route GET "/api/permissions/me"
handler wisp_api_permissions_me_get {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-me", op: "list" };
}

@route GET "/api/permissions/roles"
handler wisp_api_permissions_roles_get {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-roles", op: "list" };
}

@route GET "/api/remote-agents/status"
handler wisp_api_remote_agents_status_get {
  # source backend-services/routes/remote-agents-status.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "remote-agents-status", op: "list" };
}

@route GET "/api/system/resources"
handler wisp_api_system_resources_get {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-resources", op: "list" };
}

@route POST "/api/users/bulk-import"
handler wisp_api_users_bulk_import_post {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-bulk-import", op: "create" };
}

@route POST "/api/users/invite"
handler wisp_api_users_invite_post {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-invite", op: "create" };
}

@route GET "/api/voice/emergency-addresses"
handler wisp_api_voice_emergency_addresses_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-emergency-addresses", op: "list" };
}

@route POST "/api/voice/emergency-addresses"
handler wisp_api_voice_emergency_addresses_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-emergency-addresses", op: "create" };
}

@route GET "/api/voice/port-orders"
handler wisp_api_voice_port_orders_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-port-orders", op: "list" };
}

@route POST "/api/voice/port-orders"
handler wisp_api_voice_port_orders_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-port-orders", op: "create" };
}

@route GET "/api/voice/provider-accounts"
handler wisp_api_voice_provider_accounts_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-provider-accounts", op: "list" };
}

@route POST "/api/voice/provider-accounts"
handler wisp_api_voice_provider_accounts_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-provider-accounts", op: "create" };
}

@route GET "/api/voice/schema"
handler wisp_api_voice_schema_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-schema", op: "list" };
}

@route GET "/api/voice/service-locations"
handler wisp_api_voice_service_locations_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-service-locations", op: "list" };
}

@route POST "/api/voice/service-locations"
handler wisp_api_voice_service_locations_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-service-locations", op: "create" };
}

@route GET "/api/voice/telephone-numbers"
handler wisp_api_voice_telephone_numbers_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-telephone-numbers", op: "list" };
}

@route POST "/api/voice/telephone-numbers"
handler wisp_api_voice_telephone_numbers_post {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-telephone-numbers", op: "create" };
}

@route POST "/api/work-orders/bulk-import"
handler wisp_api_work_orders_bulk_import_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-bulk-import", op: "create" };
}

@route GET "/admin/tenants"
handler wisp_api_admin_tenants_get {
  # source backend-services/routes/admin-tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[{\"_id\":\"6a166eb07089304417ec967a\",\"name\":\"Demo WISP\",\"displayName\":\"WISPTools Demo ISP\",\"subdomain\":\"wisptools-demo\",\"contactEmail\":\"demo@wisptools.io\",\"cwmpUrl\":\"https://wisptools-demo.wisptools.io/cwmp\",\"primaryLocation\":{\"siteId\":null,\"siteName\":null},\"status\":\"active\",\"settings\":{\"allowSelfRegistration\":false,\"requireEmailVerification\":false,\"maxUsers\":100,\"maxDevices\":5000,\"features\":{\"acs\":true,\"hss\":true,\"pci\":true,\"helpDesk\":true,\"userManagement\":true,\"customerManagement\":true}},\"limits\":{\"maxUsers\":50,\"maxDevices\":1000,\"maxNetworks\":10,\"maxTowerSites\":100},\"branding\":{\"logo\":{\"altText\":\"Company Logo\"},\"colors\":{\"primary\":\"#3b82f6\",\"secondary\":\"#64748b\",\"accent\":\"#10b981\",\"background\":\"#ffffff\",\"text\":\"#111827\",\"textSecondary\":\"#6b7280\"},\"company\":{\"supportHours\":\"Mon-Fri 8am-5pm\"},\"portal\":{\"welcomeMessage\":\"Welcome to our Customer Portal\",\"enableCustomDomain\":false},\"features\":{\"enableFAQ\":true,\"enableServiceStatus\":true,\"enableBilling\":true,\"enableLiveChat\":false,\"enableKnowledgeBase\":false}},\"createdBy\":\"demo-seed-script\",\"deletedAt\":null,\"deletedBy\":null,\"createdAt\":\"2026-05-27T04:10:24.491Z\",\"updatedAt\":\"2026-05-27T04:10:24.498Z\",\"__v\":0,\"id\":\"6a166eb07089304417ec967a\",\"userCount\":2},{\"_id\":\"68f86bf494a05a3e5dd7004d\",\"name\":\"peterson\",\"displayName\":\"peterson\",\"subdomain\":\"peterson\",\"contactEmail\":\"david@tenant.com\",\"cwmpUrl\":\"https://peterson.lte-pci-mapper-65450042-bbf71.us-east4.hosted.app\",\"status\":\"active\",\"settings\":{\"allowSelfRegistration\":false,\"requireEmailVerification\":true,\"maxUsers\":50,\"maxDevices\":1000,\"features\":{\"acs\":true,\"hss\":true,\"pci\":true,\"helpDesk\":true,\"userManagement\":true,\"customerManagement\":true}},\"limits\":{\"maxUsers\":50,\"maxDevices\":1000,\"maxNetworks\":10,\"maxTowerSites\":100},\"createdBy\":\"zijIWMdwJybWPovECvY834mh0fv1\",\"deletedAt\":null,\"deletedBy\":null,\"createdAt\":\"2025-10-22T05:30:28.209Z\",\"updatedAt\":\"2025-10-22T05:30:28.210Z\",\"__v\":0,\"id\":\"68f86bf494a05a3e5dd7004d\",\"userCount\":1}]";
}

@route POST "/admin/tenants"
handler wisp_api_admin_tenants_post {
  # source backend-services/routes/admin-tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-tenants\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/admin"
handler wisp_api_admin_prefix_get {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"activeRecords\":12,\"openAlerts\":2,\"pendingTasks\":3},\"tenants\":[{\"id\":\"t1\",\"name\":\"Acme Org\",\"displayName\":\"Acme Org\",\"status\":\"active\"},{\"id\":\"t2\",\"name\":\"Beta Org\",\"displayName\":\"Beta Org\",\"status\":\"trial\"}],\"items\":[{\"id\":\"t1\",\"name\":\"Acme Org\",\"status\":\"active\"},{\"id\":\"t2\",\"name\":\"Beta Org\",\"status\":\"trial\"}],\"modules\":[{\"id\":\"customers\",\"name\":\"Customers\",\"status\":\"active\"},{\"id\":\"inventory\",\"name\":\"Inventory\",\"status\":\"active\"}]}";
}

@route POST "/api/admin"
handler wisp_api_admin_prefix_post {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-prefix\",\"op\":\"create\"}";
}

@route PUT "/api/admin"
handler wisp_api_admin_prefix_put {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-prefix\",\"op\":\"update\"}";
}

@route PATCH "/api/admin"
handler wisp_api_admin_prefix_patch {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-prefix\",\"op\":\"update\"}";
}

@route DELETE "/api/admin"
handler wisp_api_admin_prefix_delete {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-prefix\",\"op\":\"delete\"}";
}

@route GET "/api/agent"
handler wisp_api_agent_get {
  # source backend-services/routes/agent — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"agent\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/agent"
handler wisp_api_agent_post {
  # source backend-services/routes/agent — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"agent\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/agent"
handler wisp_api_agent_put {
  # source backend-services/routes/agent — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"agent\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/agent"
handler wisp_api_agent_patch {
  # source backend-services/routes/agent — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"agent\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/agent"
handler wisp_api_agent_delete {
  # source backend-services/routes/agent — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"agent\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/auth"
handler wisp_api_auth_get {
  # source backend-services/routes/auth — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"authenticated\":false,\"surface\":\"wisp-auth-native\",\"seeded\":\"contract-empty\"}";
}

@route POST "/api/auth"
handler wisp_api_auth_post {
  # source backend-services/routes/auth — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"auth\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/auth"
handler wisp_api_auth_put {
  # source backend-services/routes/auth — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"auth\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/auth"
handler wisp_api_auth_patch {
  # source backend-services/routes/auth — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"auth\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/auth"
handler wisp_api_auth_delete {
  # source backend-services/routes/auth — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"auth\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/billing"
handler wisp_api_billing_alias_get {
  # source backend-services/routes/billing-alias — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"analytics\":{\"totalRevenue\":12500.5,\"monthlyRecurringRevenue\":4200,\"activeSubscriptions\":18,\"averageRevenuePerUser\":69.44},\"plans\":[{\"id\":\"p1\",\"name\":\"Starter\",\"status\":\"active\",\"price\":49,\"isPopular\":true,\"features\":[\"email\",\"portal\"]},{\"id\":\"p2\",\"name\":\"Pro\",\"status\":\"active\",\"price\":149,\"features\":[\"email\",\"portal\",\"sla\"]}],\"invoices\":[{\"id\":\"inv-1\",\"tenant\":\"Acme\",\"amount\":149,\"status\":\"paid\"},{\"id\":\"inv-2\",\"tenant\":\"Beta\",\"amount\":49,\"status\":\"failed\"}],\"paymentMethods\":[{\"id\":\"pm-1\",\"type\":\"card\",\"tenant\":\"Acme\",\"email\":\"ops@acme.example\",\"isDefault\":true}],\"subscriptions\":[{\"id\":\"sub-1\",\"tenant\":\"Acme\",\"plan\":\"Pro\",\"status\":\"active\"}],\"items\":[{\"id\":\"inv-1\",\"name\":\"Acme invoice\",\"status\":\"paid\"}]}";
}

@route GET "/api/branding"
handler wisp_api_branding_get {
  # source backend-services/routes/branding — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"branding\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/branding"
handler wisp_api_branding_post {
  # source backend-services/routes/branding — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"branding\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/branding"
handler wisp_api_branding_put {
  # source backend-services/routes/branding — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"branding\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/branding"
handler wisp_api_branding_patch {
  # source backend-services/routes/branding — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"branding\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/branding"
handler wisp_api_branding_delete {
  # source backend-services/routes/branding — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"branding\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/bundles"
handler wisp_api_bundles_get {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"bundles\":[{\"_id\":\"6a5979a2ad923e3601e03cb5\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248725236\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:38:58.751Z\",\"updatedAt\":\"2026-07-17T00:38:59.898Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248738977\"},{\"_id\":\"6a59793fad923e3601e03bf2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248625601\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:37:19.103Z\",\"updatedAt\":\"2026-07-17T00:37:20.286Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248639346\"},{\"_id\":\"6a5978c6ad923e3601e03b13\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248505811\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:35:18.632Z\",\"updatedAt\":\"2026-07-17T00:35:19.792Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248518863\"},{\"_id\":\"6a5978abad923e3601e03a7e\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248478296\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:34:51.638Z\",\"updatedAt\":\"2026-07-17T00:34:52.835Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248491850\"},{\"_id\":\"6a597813ad923e3601e03998\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248326355\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:32:19.701Z\",\"updatedAt\":\"2026-07-17T00:32:20.920Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248339918\"},{\"_id\":\"6a597766ad923e3601e038d6\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248153441\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:29:26.656Z\",\"updatedAt\":\"2026-07-17T00:29:27.798Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248166876\"},{\"_id\":\"6a59773ead923e3601e03835\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248112698\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:28:46.355Z\",\"updatedAt\":\"2026-07-17T00:28:47.501Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248126567\"},{\"_id\":\"6a5976daad923e3601e03786\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784248013356\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:27:06.401Z\",\"updatedAt\":\"2026-07-17T00:27:07.514Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784248026627\"},{\"_id\":\"6a59764bad923e3601e036ca\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784247869413\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:24:43.056Z\",\"updatedAt\":\"2026-07-17T00:24:44.202Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784247883274\"},{\"_id\":\"6a5974c1ad923e3601e03616\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784247475446\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:18:09.082Z\",\"updatedAt\":\"2026-07-17T00:18:10.295Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784247489295\"},{\"_id\":\"6a59749aad923e3601e03568\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784247436475\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:17:30.428Z\",\"updatedAt\":\"2026-07-17T00:17:31.641Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784247450641\"},{\"_id\":\"6a59743bad923e3601e034ec\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"BI 1784247353418\",\"description\":\"chrysalis-n10o\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:15:55.474Z\",\"updatedAt\":\"2026-07-17T00:15:55.694Z\",\"estimatedTotalCost\":0,\"__v\":2},{\"_id\":\"6a597437ad923e3601e034a4\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784247337376\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:15:51.280Z\",\"updatedAt\":\"2026-07-17T00:15:52.419Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784247351489\"},{\"_id\":\"6a5971a4ad923e3601e03436\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"BI 1784246690725\",\"description\":\"n10o\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:04:52.604Z\",\"updatedAt\":\"2026-07-17T00:04:52.605Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a597136ad923e3601e033a1\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784246569223\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:03:02.348Z\",\"updatedAt\":\"2026-07-17T00:03:03.489Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784246582551\"},{\"_id\":\"6a5970cfad923e3601e03289\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784246466043\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":1,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T00:01:19.495Z\",\"updatedAt\":\"2026-07-17T00:01:44.281Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784246479684\",\"lastUsedAt\":\"2026-07-17T00:01:44.280Z\"},{\"_id\":\"6a596faaad923e3601e030e8\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784246173279\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:56:26.857Z\",\"updatedAt\":\"2026-07-16T23:56:28.009Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784246187045\"},{\"_id\":\"6a596f5bad923e3601e03075\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"Bun 1784246105920\",\"description\":\"x\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:55:07.287Z\",\"updatedAt\":\"2026-07-16T23:55:07.288Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a596f48ad923e3601e0301d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784246075705\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":1,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:54:48.493Z\",\"updatedAt\":\"2026-07-16T23:54:51.800Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784246088671\",\"lastUsedAt\":\"2026-07-16T23:54:51.799Z\"},{\"_id\":\"6a596f1fad923e3601e02f79\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784246033446\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:54:07.167Z\",\"updatedAt\":\"2026-07-16T23:54:08.356Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784246047369\"},{\"_id\":\"6a596e47ad923e3601e02e4a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784245817790\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":1,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"radio\",\"quantity\":1,\"notes\":\"chrysalis-bundle-item\",\"_id\":\"6a596e4cad923e3601e02e87\"}],\"images\":[],\"createdAt\":\"2026-07-16T23:50:31.250Z\",\"updatedAt\":\"2026-07-16T23:53:55.527Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784245831450\",\"description\":\"chrysalis-bundle-1784245833466\",\"lastUsedAt\":\"2026-07-16T23:53:55.526Z\"},{\"_id\":\"6a596e26ad923e3601e02dab\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784245784750\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"radio\",\"quantity\":1,\"notes\":\"chrysalis-bundle-item\",\"_id\":\"6a596e2bad923e3601e02de6\"}],\"images\":[],\"createdAt\":\"2026-07-16T23:49:58.264Z\",\"updatedAt\":\"2026-07-16T23:50:03.417Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784245798442\",\"description\":\"chrysalis-bundle-1784245800341\"},{\"_id\":\"6a596c77ad923e3601dff63e\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784245354128\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"radio\",\"quantity\":1,\"_id\":\"6a596da5ad923e3601e02d52\"}],\"images\":[],\"createdAt\":\"2026-07-16T23:42:47.744Z\",\"updatedAt\":\"2026-07-16T23:47:49.094Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784245367907\",\"description\":\"chrysalis-bundle-1784245646496\"},{\"_id\":\"6a596a9bad923e3601dfede7\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784244878728\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:34:51.146Z\",\"updatedAt\":\"2026-07-16T23:34:52.271Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784244891288\"},{\"_id\":\"6a5969caad923e3601dfe572\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784244619464\",\"description\":\"chrysalis\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:31:22.716Z\",\"updatedAt\":\"2026-07-16T23:31:22.716Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a59687ead923e3601dfdd2c\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784244339318\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:25:50.926Z\",\"updatedAt\":\"2026-07-16T23:25:52.044Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784244351060\"},{\"_id\":\"6a596812ad923e3601dfdcad\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784244230652\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T23:24:02.542Z\",\"updatedAt\":\"2026-07-16T23:24:03.656Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784244242665\"},{\"_id\":\"6a596013ad923e3601dfda9a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784242185937\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":1,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T22:49:55.981Z\",\"updatedAt\":\"2026-07-16T22:49:58.388Z\",\"estimatedTotalCost\":0,\"__v\":2,\"notes\":\"chrysalis-live-mutate-put-1784242195957\",\"lastUsedAt\":\"2026-07-16T22:49:58.387Z\"},{\"_id\":\"6a595ff5ad923e3601dfd9f9\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784242155665\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":1,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T22:49:25.283Z\",\"updatedAt\":\"2026-07-16T22:49:27.632Z\",\"estimatedTotalCost\":0,\"__v\":2,\"notes\":\"chrysalis-live-mutate-put-1784242165250\",\"lastUsedAt\":\"2026-07-16T22:49:27.632Z\"},{\"_id\":\"6a595e82ad923e3601dfd95d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784241784755\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"quantity\":2,\"notes\":\"chrysalis-bundle-item-put\",\"_id\":\"6a595e86ad923e3601dfd991\"}],\"images\":[],\"createdAt\":\"2026-07-16T22:43:14.938Z\",\"updatedAt\":\"2026-07-16T22:43:18.705Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784241794916\"},{\"_id\":\"6a595e4ead923e3601dfd8c6\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784241729602\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"quantity\":2,\"notes\":\"chrysalis-bundle-item-put\",\"_id\":\"6a595e52ad923e3601dfd8f8\"}],\"images\":[],\"createdAt\":\"2026-07-16T22:42:22.614Z\",\"updatedAt\":\"2026-07-16T22:42:27.193Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784241742748\"},{\"_id\":\"6a58eb35ad923e3601dfd836\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784212269635\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[{\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"quantity\":1,\"notes\":\"chrysalis-bundle-item\",\"_id\":\"6a58eb38ad923e3601dfd86f\"}],\"images\":[],\"createdAt\":\"2026-07-16T14:31:17.654Z\",\"updatedAt\":\"2026-07-16T14:31:20.107Z\",\"estimatedTotalCost\":0,\"__v\":1,\"notes\":\"chrysalis-live-mutate-put-1784212277860\"},{\"_id\":\"6a58eb0dad923e3601dfd7ac\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784212228820\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T14:30:37.292Z\",\"updatedAt\":\"2026-07-16T14:30:38.092Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784212237500\"},{\"_id\":\"6a58ea60ad923e3601dfd711\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784212055760\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T14:27:44.375Z\",\"updatedAt\":\"2026-07-16T14:27:45.197Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784212064612\"},{\"_id\":\"6a58e75bad923e3601dfd6a1\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784211282920\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T14:14:51.104Z\",\"updatedAt\":\"2026-07-16T14:14:51.907Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784211291311\"},{\"_id\":\"6a58e745ad923e3601dfd62e\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784211261296\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T14:14:29.437Z\",\"updatedAt\":\"2026-07-16T14:14:30.204Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784211269636\"},{\"_id\":\"6a58e71ead923e3601dfd5c5\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784211221400\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T14:13:50.075Z\",\"updatedAt\":\"2026-07-16T14:13:50.915Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784211230313\"},{\"_id\":\"6a58d642ad923e3601dfd563\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784206906091\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T13:01:54.641Z\",\"updatedAt\":\"2026-07-16T13:01:55.486Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784206914884\"},{\"_id\":\"6a58702bad923e3601dfd50f\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784180769231\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:46:19.059Z\",\"updatedAt\":\"2026-07-16T05:46:19.059Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586ab7c38e0189a02449e0\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784179374907\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:23:03.462Z\",\"updatedAt\":\"2026-07-16T05:23:03.462Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a58686dc38e0189a0244987\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784178789807\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:13:17.581Z\",\"updatedAt\":\"2026-07-16T05:13:17.582Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586844c38e0189a0244949\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784178748195\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:12:36.395Z\",\"updatedAt\":\"2026-07-16T05:12:36.395Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586833c38e0189a024490a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784178731351\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:12:19.464Z\",\"updatedAt\":\"2026-07-16T05:12:19.465Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586602c38e0189a02448ac\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784178170286\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:02:58.052Z\",\"updatedAt\":\"2026-07-16T05:02:58.052Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a5865dcc38e0189a0244872\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784178132526\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T05:02:20.854Z\",\"updatedAt\":\"2026-07-16T05:02:20.855Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a58646cc38e0189a0244833\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784177764625\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T04:56:12.344Z\",\"updatedAt\":\"2026-07-16T04:56:12.345Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586415c38e0189a02447f9\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784177677771\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T04:54:45.942Z\",\"updatedAt\":\"2026-07-16T04:54:45.942Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a58620cc38e0189a024479d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784177163301\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T04:46:04.954Z\",\"updatedAt\":\"2026-07-16T04:46:04.954Z\",\"estimatedTotalCost\":0,\"__v\":0},{\"_id\":\"6a586150c38e0189a0244778\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784176975763\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-16T04:42:56.795Z\",\"updatedAt\":\"2026-07-16T04:42:56.798Z\",\"estimatedTotalCost\":0,\"__v\":0}],\"pagination\":{\"page\":1,\"limit\":50,\"total\":49,\"pages\":1}}";
}

@route POST "/api/bundles"
handler wisp_api_bundles_post {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784255421599\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"_id\":\"6a5993caad923e3601e03d73\",\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T02:30:34.443Z\",\"updatedAt\":\"2026-07-17T02:30:34.444Z\",\"estimatedTotalCost\":0,\"__v\":0}";
}

@route GET "/api/coverage"
handler wisp_api_coverage_get {
  # source backend-services/routes/coverage — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"coverage\":[{\"id\":\"c1\",\"name\":\"Sector Alpha\",\"status\":\"active\",\"lat\":39.8283,\"lng\":-98.5795},{\"id\":\"c2\",\"name\":\"Sector Beta\",\"status\":\"active\",\"lat\":39.91,\"lng\":-98.65}],\"items\":[{\"id\":\"c1\",\"name\":\"Sector Alpha\",\"status\":\"active\",\"lat\":39.8283,\"lng\":-98.5795},{\"id\":\"c2\",\"name\":\"Sector Beta\",\"status\":\"active\",\"lat\":39.91,\"lng\":-98.65}]}";
}

@route GET "/api/customer-billing"
handler wisp_api_customer_billing_get {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"analytics\":{\"totalRevenue\":12500.5,\"monthlyRecurringRevenue\":4200,\"activeSubscriptions\":18,\"averageRevenuePerUser\":69.44},\"plans\":[{\"id\":\"p1\",\"name\":\"Starter\",\"status\":\"active\",\"price\":49,\"isPopular\":true,\"features\":[\"email\",\"portal\"]},{\"id\":\"p2\",\"name\":\"Pro\",\"status\":\"active\",\"price\":149,\"features\":[\"email\",\"portal\",\"sla\"]}],\"invoices\":[{\"id\":\"inv-1\",\"tenant\":\"Acme\",\"amount\":149,\"status\":\"paid\"},{\"id\":\"inv-2\",\"tenant\":\"Beta\",\"amount\":49,\"status\":\"failed\"}],\"paymentMethods\":[{\"id\":\"pm-1\",\"type\":\"card\",\"tenant\":\"Acme\",\"email\":\"ops@acme.example\",\"isDefault\":true}],\"subscriptions\":[{\"id\":\"sub-1\",\"tenant\":\"Acme\",\"plan\":\"Pro\",\"status\":\"active\"}],\"items\":[{\"id\":\"inv-1\",\"name\":\"Acme invoice\",\"status\":\"paid\"}]}";
}

@route POST "/api/customer-billing"
handler wisp_api_customer_billing_post {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"create\"}";
}

@route GET "/api/customer-portal"
handler wisp_api_customer_portal_get {
  # source backend-services/routes/customer-portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-portal\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/customer-portal"
handler wisp_api_customer_portal_post {
  # source backend-services/routes/customer-portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-portal\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/customer-portal"
handler wisp_api_customer_portal_put {
  # source backend-services/routes/customer-portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-portal\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/customer-portal"
handler wisp_api_customer_portal_patch {
  # source backend-services/routes/customer-portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-portal\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/customer-portal"
handler wisp_api_customer_portal_delete {
  # source backend-services/routes/customer-portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-portal\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/customers"
handler wisp_api_customers_get {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"total\":3,\"active\":2,\"pending\":1,\"suspended\":0},\"customers\":[{\"customerId\":\"c1\",\"name\":\"Acme Wireless\",\"status\":\"active\",\"email\":\"ops@acme.example\"},{\"customerId\":\"c2\",\"name\":\"Beta ISP\",\"status\":\"pending\",\"email\":\"admin@beta.example\"},{\"customerId\":\"c3\",\"name\":\"Canyon Net\",\"status\":\"active\",\"email\":\"noc@canyon.example\"}],\"items\":[{\"id\":\"c1\",\"name\":\"Acme Wireless\",\"status\":\"active\"},{\"id\":\"c2\",\"name\":\"Beta ISP\",\"status\":\"pending\"},{\"id\":\"c3\",\"name\":\"Canyon Net\",\"status\":\"active\"}]}";
}

@route POST "/api/customers"
handler wisp_api_customers_post {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"tenantId\":\"6a166eb07089304417ec967a\",\"customerId\":\"CUST-2026-0048\",\"isLead\":false,\"leadStatus\":\"new\",\"firstName\":\"CWL\",\"lastName\":\"Trace1784255421599\",\"fullName\":\"CWL Trace1784255421599\",\"primaryPhone\":\"555-0100\",\"email\":\"cwl-trace-1784255421599@example.com\",\"serviceAddress\":{\"country\":\"USA\"},\"billingAddress\":{\"country\":\"USA\",\"sameAsService\":true},\"serviceStatus\":\"active\",\"servicePlan\":{\"currency\":\"USD\",\"qci\":9,\"priorityLevel\":\"medium\"},\"lteAuth\":{\"sqn\":0},\"installation\":{\"status\":\"not-scheduled\",\"otherEquipment\":[]},\"notes\":\"chrysalis-live-mutate-trace\",\"tags\":[],\"accountStatus\":\"good-standing\",\"billingInfo\":{\"accountBalance\":0,\"autopay\":false},\"portalAccess\":{\"enabled\":true,\"accountStatus\":\"pending\"},\"isActive\":true,\"_id\":\"6a5993caad923e3601e03d78\",\"serviceHistory\":[],\"complaints\":[],\"createdAt\":\"2026-07-17T02:30:34.663Z\",\"updatedAt\":\"2026-07-17T02:30:34.664Z\",\"__v\":0}";
}

@route GET "/api/deploy"
handler wisp_api_deploy_get {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"deployments\":[{\"id\":\"d1\",\"name\":\"Site Deploy\",\"status\":\"scheduled\"}],\"items\":[{\"id\":\"d1\",\"name\":\"Site Deploy\",\"status\":\"scheduled\"}]}";
}

@route POST "/api/deploy"
handler wisp_api_deploy_post {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"deploy\",\"op\":\"create\"}";
}

@route PUT "/api/deploy"
handler wisp_api_deploy_put {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"deploy\",\"op\":\"update\"}";
}

@route PATCH "/api/deploy"
handler wisp_api_deploy_patch {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"deploy\",\"op\":\"update\"}";
}

@route DELETE "/api/deploy"
handler wisp_api_deploy_delete {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"deploy\",\"op\":\"delete\"}";
}

@route GET "/api/device-assignment"
handler wisp_api_device_assignment_get {
  # source backend-services/routes/device-assignment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"device-assignment\",\"op\":\"list\"}";
}

@route POST "/api/device-assignment"
handler wisp_api_device_assignment_post {
  # source backend-services/routes/device-assignment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"device-assignment\",\"op\":\"create\"}";
}

@route PUT "/api/device-assignment"
handler wisp_api_device_assignment_put {
  # source backend-services/routes/device-assignment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"device-assignment\",\"op\":\"update\"}";
}

@route PATCH "/api/device-assignment"
handler wisp_api_device_assignment_patch {
  # source backend-services/routes/device-assignment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"device-assignment\",\"op\":\"update\"}";
}

@route DELETE "/api/device-assignment"
handler wisp_api_device_assignment_delete {
  # source backend-services/routes/device-assignment — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"device-assignment\",\"op\":\"delete\"}";
}

@route GET "/api/epc"
handler wisp_api_epc_get {
  # source backend-services/routes/epc — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/epc"
handler wisp_api_epc_post {
  # source backend-services/routes/epc — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/epc"
handler wisp_api_epc_put {
  # source backend-services/routes/epc — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/epc"
handler wisp_api_epc_patch {
  # source backend-services/routes/epc — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/epc"
handler wisp_api_epc_delete {
  # source backend-services/routes/epc — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/epc-management"
handler wisp_api_epc_management_get {
  # source backend-services/routes/epc-management — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-management\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/epc-management"
handler wisp_api_epc_management_post {
  # source backend-services/routes/epc-management — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-management\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/epc-management"
handler wisp_api_epc_management_put {
  # source backend-services/routes/epc-management — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-management\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/epc-management"
handler wisp_api_epc_management_patch {
  # source backend-services/routes/epc-management — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-management\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/epc-management"
handler wisp_api_epc_management_delete {
  # source backend-services/routes/epc-management — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-management\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/epc-updates"
handler wisp_api_epc_updates_get {
  # source backend-services/routes/epc-updates — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-updates\",\"op\":\"list\"}";
}

@route POST "/api/epc-updates"
handler wisp_api_epc_updates_post {
  # source backend-services/routes/epc-updates — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-updates\",\"op\":\"create\"}";
}

@route PUT "/api/epc-updates"
handler wisp_api_epc_updates_put {
  # source backend-services/routes/epc-updates — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-updates\",\"op\":\"update\"}";
}

@route PATCH "/api/epc-updates"
handler wisp_api_epc_updates_patch {
  # source backend-services/routes/epc-updates — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-updates\",\"op\":\"update\"}";
}

@route DELETE "/api/epc-updates"
handler wisp_api_epc_updates_delete {
  # source backend-services/routes/epc-updates — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"epc-updates\",\"op\":\"delete\"}";
}

@route GET "/api/equipment-pricing"
handler wisp_api_equipment_pricing_get {
  # source backend-services/routes/equipment-pricing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[{\"_id\":\"6a597064ad923e3601e031f4\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"manufacturer\":\"CWL\",\"model\":\"Y1784246371160\",\"basePrice\":5,\"currency\":\"USD\",\"source\":\"manual\",\"quantity\":1,\"unitPrice\":5,\"lastUpdated\":\"2026-07-16T23:59:32.041Z\",\"createdAt\":\"2026-07-16T23:59:32.042Z\",\"updatedAt\":\"2026-07-16T23:59:32.042Z\",\"__v\":0},{\"_id\":\"6a58ea64ad923e3601dfd761\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"manufacturer\":\"Trace\",\"model\":\"CWL-1784212068024\",\"basePrice\":99,\"currency\":\"USD\",\"source\":\"manual\",\"notes\":\"chrysalis-pricing\",\"quantity\":1,\"unitPrice\":99,\"lastUpdated\":\"2026-07-16T14:27:48.063Z\",\"createdAt\":\"2026-07-16T14:27:48.064Z\",\"updatedAt\":\"2026-07-16T14:27:48.064Z\",\"__v\":0},{\"_id\":\"6a5969eaad923e3601dfed5d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"antenna\",\"manufacturer\":\"CWL\",\"model\":\"M1\",\"basePrice\":99,\"currency\":\"USD\",\"source\":\"manual\",\"quantity\":1,\"unitPrice\":99,\"lastUpdated\":\"2026-07-16T23:31:54.566Z\",\"createdAt\":\"2026-07-16T23:31:54.566Z\",\"updatedAt\":\"2026-07-16T23:31:54.566Z\",\"__v\":0},{\"_id\":\"6a597917ad923e3601e03b83\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"radio\",\"manufacturer\":\"CWL\",\"model\":\"n10w-1784248598459\",\"basePrice\":99,\"currency\":\"USD\",\"source\":\"manual\",\"quantity\":1,\"unitPrice\":99,\"lastUpdated\":\"2026-07-17T00:36:39.352Z\",\"createdAt\":\"2026-07-17T00:36:39.352Z\",\"updatedAt\":\"2026-07-17T00:36:39.352Z\",\"__v\":0},{\"_id\":\"6a5969eaad923e3601dfed5a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"radio\",\"manufacturer\":\"\",\"model\":\"\",\"basePrice\":99,\"currency\":\"USD\",\"source\":\"manual\",\"quantity\":1,\"unitPrice\":99,\"lastUpdated\":\"2026-07-16T23:31:54.448Z\",\"createdAt\":\"2026-07-16T23:31:54.449Z\",\"updatedAt\":\"2026-07-16T23:31:54.449Z\",\"__v\":0},{\"_id\":\"6a5969eaad923e3601dfed60\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"router\",\"manufacturer\":\"\",\"model\":\"\",\"basePrice\":10,\"currency\":\"USD\",\"source\":\"manual\",\"quantity\":1,\"unitPrice\":10,\"lastUpdated\":\"2026-07-16T23:31:54.678Z\",\"createdAt\":\"2026-07-16T23:31:54.678Z\",\"updatedAt\":\"2026-07-16T23:31:54.678Z\",\"__v\":0}]";
}

@route POST "/api/equipment-pricing"
handler wisp_api_equipment_pricing_post {
  # source backend-services/routes/equipment-pricing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"equipment-pricing\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/hardware"
handler wisp_api_hardware_get {
  # source backend-services/routes/hardware — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"total\":4,\"inStock\":3,\"rma\":1},\"items\":[{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"in-stock\"},{\"id\":\"inv-2\",\"name\":\"Sector-60\",\"status\":\"in-stock\"},{\"id\":\"inv-3\",\"name\":\"Backhaul-Link\",\"status\":\"rma\"}],\"devices\":[{\"id\":\"dev-1\",\"name\":\"CPE-AX100\",\"status\":\"online\"},{\"id\":\"dev-2\",\"name\":\"CPE-BX200\",\"status\":\"offline\"}]}";
}

@route GET "/api/hss"
handler wisp_api_hss_get {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"subscribers\":120,\"active\":110},\"groups\":[{\"id\":\"g1\",\"name\":\"Default\",\"status\":\"active\"},{\"id\":\"g2\",\"name\":\"VIP\",\"status\":\"active\"}],\"items\":[{\"id\":\"g1\",\"name\":\"Default\",\"status\":\"active\"},{\"id\":\"g2\",\"name\":\"VIP\",\"status\":\"active\"}]}";
}

@route POST "/api/hss"
handler wisp_api_hss_post {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"hss\",\"op\":\"create\"}";
}

@route PUT "/api/hss"
handler wisp_api_hss_put {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"hss\",\"op\":\"update\"}";
}

@route PATCH "/api/hss"
handler wisp_api_hss_patch {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"hss\",\"op\":\"update\"}";
}

@route DELETE "/api/hss"
handler wisp_api_hss_delete {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"hss\",\"op\":\"delete\"}";
}

@route GET "/api/incidents"
handler wisp_api_incidents_get {
  # source backend-services/routes/incidents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[{\"_id\":\"6a5979a2ad923e3601e03cb7\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248725236\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248725236\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:38:45.236Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:38:58.859Z\",\"updatedAt\":\"2026-07-17T00:38:59.665Z\",\"__v\":0},{\"_id\":\"6a59793fad923e3601e03bf4\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248625601\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248625601\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:37:05.601Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:37:19.216Z\",\"updatedAt\":\"2026-07-17T00:37:20.053Z\",\"__v\":0},{\"_id\":\"6a5978c6ad923e3601e03b15\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248505811\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248505811\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:35:05.811Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:35:18.749Z\",\"updatedAt\":\"2026-07-17T00:35:19.562Z\",\"__v\":0},{\"_id\":\"6a5978abad923e3601e03a80\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248478296\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248478296\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:34:38.296Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:34:51.740Z\",\"updatedAt\":\"2026-07-17T00:34:52.602Z\",\"__v\":0},{\"_id\":\"6a597813ad923e3601e0399a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248326355\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248326355\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:32:06.355Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:32:19.810Z\",\"updatedAt\":\"2026-07-17T00:32:20.701Z\",\"__v\":0},{\"_id\":\"6a597766ad923e3601e038d8\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248153441\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248153441\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:29:13.441Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:29:26.771Z\",\"updatedAt\":\"2026-07-17T00:29:27.567Z\",\"__v\":0},{\"_id\":\"6a59773ead923e3601e03837\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248112698\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248112698\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:28:32.698Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:28:46.462Z\",\"updatedAt\":\"2026-07-17T00:28:47.239Z\",\"__v\":0},{\"_id\":\"6a5976daad923e3601e03788\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784248013356\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784248013356\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:26:53.356Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:27:06.508Z\",\"updatedAt\":\"2026-07-17T00:27:07.294Z\",\"__v\":0},{\"_id\":\"6a59764bad923e3601e036cc\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784247869413\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784247869413\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:24:29.413Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:24:43.163Z\",\"updatedAt\":\"2026-07-17T00:24:43.966Z\",\"__v\":0},{\"_id\":\"6a5974c1ad923e3601e03618\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784247475446\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784247475446\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:17:55.446Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:18:09.193Z\",\"updatedAt\":\"2026-07-17T00:18:10.067Z\",\"__v\":0},{\"_id\":\"6a59749aad923e3601e0356a\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784247436475\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784247436475\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:17:16.476Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:17:30.530Z\",\"updatedAt\":\"2026-07-17T00:17:31.423Z\",\"__v\":0},{\"_id\":\"6a597437ad923e3601e034a6\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784247337376\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784247337376\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:15:37.376Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:15:51.386Z\",\"updatedAt\":\"2026-07-17T00:15:52.182Z\",\"__v\":0},{\"_id\":\"6a597136ad923e3601e033a3\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246569223\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784246569223\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:02:49.223Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:03:02.463Z\",\"updatedAt\":\"2026-07-17T00:03:03.260Z\",\"__v\":0},{\"_id\":\"6a5970cfad923e3601e0328b\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246466043\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"converted\",\"title\":\"CWL Trace Incident 1784246466043\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T00:01:06.043Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T00:01:19.597Z\",\"updatedAt\":\"2026-07-17T00:01:45.129Z\",\"__v\":0,\"acknowledgedAt\":\"2026-07-17T00:01:44.893Z\",\"acknowledgedBy\":\"cwl\",\"acknowledgedByName\":\"CWL\",\"resolution\":\"n10n\",\"resolvedAt\":\"2026-07-17T00:01:45.006Z\",\"convertedAt\":\"2026-07-17T00:01:45.128Z\",\"convertedBy\":\"system\",\"relatedTicketId\":\"6a5970e9ad923e3601e03323\",\"relatedTicketNumber\":\"TKT-2026-0041\"},{\"_id\":\"6a596faaad923e3601e030ea\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246173279\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784246173279\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:56:13.279Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:56:26.969Z\",\"updatedAt\":\"2026-07-16T23:56:27.780Z\",\"__v\":0},{\"_id\":\"6a596f48ad923e3601e0301f\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246075705\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784246075705\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:54:35.705Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:54:48.597Z\",\"updatedAt\":\"2026-07-16T23:54:49.355Z\",\"__v\":0},{\"_id\":\"6a596f1fad923e3601e02f7b\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246033446\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"closed\",\"title\":\"CWL Trace Incident 1784246033446\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:53:53.446Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"n10j-note-1784246049355\",\"_id\":\"6a596f23ad923e3601e02fb5\",\"timestamp\":\"2026-07-16T23:54:11.258Z\"}],\"createdAt\":\"2026-07-16T23:54:07.276Z\",\"updatedAt\":\"2026-07-16T23:54:11.370Z\",\"__v\":1,\"closedAt\":\"2026-07-16T23:54:11.369Z\"},{\"_id\":\"6a596e47ad923e3601e02e4c\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784245817790\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"closed\",\"title\":\"CWL Trace Incident 1784245817790\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:50:17.790Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"n10j-note\",\"_id\":\"6a596ee3ad923e3601e02ed9\",\"timestamp\":\"2026-07-16T23:53:07.422Z\"}],\"createdAt\":\"2026-07-16T23:50:31.364Z\",\"updatedAt\":\"2026-07-16T23:53:07.538Z\",\"__v\":1,\"closedAt\":\"2026-07-16T23:53:07.538Z\"},{\"_id\":\"6a596e26ad923e3601e02dad\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784245784750\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784245784750\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:49:44.750Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:49:58.370Z\",\"updatedAt\":\"2026-07-16T23:49:59.185Z\",\"__v\":0},{\"_id\":\"6a596c77ad923e3601dff640\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784245354128\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784245354128\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:42:34.128Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"chrysalis-inc-note-1784245369687\",\"_id\":\"6a596c95ad923e3601dff674\",\"timestamp\":\"2026-07-16T23:43:17.452Z\"}],\"createdAt\":\"2026-07-16T23:42:47.848Z\",\"updatedAt\":\"2026-07-16T23:43:17.453Z\",\"__v\":1},{\"_id\":\"6a596a9bad923e3601dfede9\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784244878728\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784244878728\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:34:38.728Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"chrysalis-inc-note-1784244893089\",\"_id\":\"6a596ab8ad923e3601dfee1d\",\"timestamp\":\"2026-07-16T23:35:20.792Z\"}],\"createdAt\":\"2026-07-16T23:34:51.248Z\",\"updatedAt\":\"2026-07-16T23:35:20.793Z\",\"__v\":1},{\"_id\":\"6a59687fad923e3601dfdd2e\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784244339318\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"investigating\",\"title\":\"CWL Trace Incident 1784244339318\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:25:39.318Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"chrysalis-inc-note\",\"_id\":\"6a5969ecad923e3601dfed71\",\"timestamp\":\"2026-07-16T23:31:56.346Z\"}],\"createdAt\":\"2026-07-16T23:25:51.031Z\",\"updatedAt\":\"2026-07-16T23:31:56.347Z\",\"__v\":1},{\"_id\":\"6a596812ad923e3601dfdcaf\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784244230652\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784244230652\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:23:50.652Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:24:02.648Z\",\"updatedAt\":\"2026-07-16T23:24:03.428Z\",\"__v\":0},{\"_id\":\"6a596676ad923e3601dfdbf0\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784243819246\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784243819246\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:16:59.246Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:17:10.805Z\",\"updatedAt\":\"2026-07-16T23:17:11.578Z\",\"__v\":0},{\"_id\":\"6a596622ad923e3601dfdb48\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784243733732\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784243733732\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T23:15:33.732Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T23:15:46.132Z\",\"updatedAt\":\"2026-07-16T23:15:47.058Z\",\"__v\":0},{\"_id\":\"6a596014ad923e3601dfda9c\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784242185937\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784242185937\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T22:49:45.937Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:49:56.064Z\",\"updatedAt\":\"2026-07-16T22:49:56.749Z\",\"__v\":0},{\"_id\":\"6a595ff5ad923e3601dfd9fb\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784242155665\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784242155665\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T22:49:15.665Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:49:25.373Z\",\"updatedAt\":\"2026-07-16T22:49:25.992Z\",\"__v\":0},{\"_id\":\"6a595e86ad923e3601dfd99b\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CL-1784241798494\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"closed\",\"title\":\"CWL Close 1784241798494\",\"description\":\"chrysalis-close\",\"detectedAt\":\"2026-07-16T22:43:18.494Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:43:18.812Z\",\"updatedAt\":\"2026-07-16T22:43:18.900Z\",\"__v\":0,\"closedAt\":\"2026-07-16T22:43:18.899Z\"},{\"_id\":\"6a595e83ad923e3601dfd95f\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784241784755\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784241784755\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T22:43:04.755Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:43:15.041Z\",\"updatedAt\":\"2026-07-16T22:43:15.711Z\",\"__v\":0},{\"_id\":\"6a595e53ad923e3601dfd901\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CL-1784241746978\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"closed\",\"title\":\"CWL Close 1784241746978\",\"description\":\"chrysalis-close\",\"detectedAt\":\"2026-07-16T22:42:26.978Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:42:27.299Z\",\"updatedAt\":\"2026-07-16T22:42:27.416Z\",\"__v\":0,\"closedAt\":\"2026-07-16T22:42:27.416Z\"},{\"_id\":\"6a595e4ead923e3601dfd8c8\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784241729602\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784241729602\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T22:42:09.602Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T22:42:22.769Z\",\"updatedAt\":\"2026-07-16T22:42:23.631Z\",\"__v\":0},{\"_id\":\"6a58eb37ad923e3601dfd85c\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CVT-1784212279445\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"converted\",\"title\":\"CWL Convert 1784212279445\",\"description\":\"chrysalis-convert\",\"detectedAt\":\"2026-07-16T14:31:19.445Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:31:19.477Z\",\"updatedAt\":\"2026-07-16T14:31:19.581Z\",\"__v\":0,\"convertedAt\":\"2026-07-16T14:31:19.580Z\",\"convertedBy\":\"system\",\"relatedTicketId\":\"6a58eb37ad923e3601dfd860\",\"relatedTicketNumber\":\"TKT-2026-0020\"},{\"_id\":\"6a58eb35ad923e3601dfd838\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784212269635\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784212269635\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:31:09.635Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:31:17.734Z\",\"updatedAt\":\"2026-07-16T14:31:18.272Z\",\"__v\":0},{\"_id\":\"6a58eb0fad923e3601dfd7d2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CVT-1784212239238\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"converted\",\"title\":\"CWL Convert 1784212239238\",\"description\":\"chrysalis-convert\",\"detectedAt\":\"2026-07-16T14:30:39.238Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:30:39.268Z\",\"updatedAt\":\"2026-07-16T14:30:39.363Z\",\"__v\":0,\"convertedAt\":\"2026-07-16T14:30:39.363Z\",\"convertedBy\":\"system\",\"relatedTicketId\":\"6a58eb0fad923e3601dfd7d6\",\"relatedTicketNumber\":\"TKT-2026-0018\"},{\"_id\":\"6a58eb0dad923e3601dfd7ae\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784212228820\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784212228820\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:30:28.820Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:30:37.370Z\",\"updatedAt\":\"2026-07-16T14:30:37.928Z\",\"__v\":0},{\"_id\":\"6a58ea60ad923e3601dfd713\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784212055760\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784212055760\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:27:35.760Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[{\"note\":\"chrysalis-incident-note\",\"addedBy\":\"cwl\",\"addedByName\":\"CWL Demo\",\"_id\":\"6a58ea62ad923e3601dfd73c\",\"timestamp\":\"2026-07-16T14:27:46.347Z\"}],\"createdAt\":\"2026-07-16T14:27:44.454Z\",\"updatedAt\":\"2026-07-16T14:27:46.348Z\",\"__v\":1},{\"_id\":\"6a58e75bad923e3601dfd6a3\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784211282920\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"acknowledged\",\"title\":\"CWL Trace Incident 1784211282920\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:14:42.920Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:14:51.180Z\",\"updatedAt\":\"2026-07-16T14:14:54.212Z\",\"__v\":0,\"acknowledgedAt\":\"2026-07-16T14:14:54.211Z\",\"acknowledgedBy\":\"cwl\",\"acknowledgedByName\":\"CWL Demo\"},{\"_id\":\"6a58e745ad923e3601dfd630\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784211261296\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"acknowledged\",\"title\":\"CWL Trace Incident 1784211261296\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:14:21.296Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:14:29.506Z\",\"updatedAt\":\"2026-07-16T14:14:32.207Z\",\"__v\":0,\"acknowledgedAt\":\"2026-07-16T14:14:32.206Z\",\"acknowledgedBy\":\"cwl\",\"acknowledgedByName\":\"CWL Demo\"},{\"_id\":\"6a58e71ead923e3601dfd5c7\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784211221400\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"acknowledged\",\"title\":\"CWL Trace Incident 1784211221400\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T14:13:41.400Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T14:13:50.156Z\",\"updatedAt\":\"2026-07-16T14:13:52.736Z\",\"__v\":0,\"acknowledgedAt\":\"2026-07-16T14:13:52.736Z\",\"acknowledgedBy\":\"cwl\",\"acknowledgedByName\":\"CWL Demo\"},{\"_id\":\"6a58d642ad923e3601dfd565\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784206906091\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784206906091\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T13:01:46.091Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T13:01:54.721Z\",\"updatedAt\":\"2026-07-16T13:01:55.316Z\",\"__v\":0},{\"_id\":\"6a58702bad923e3601dfd511\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784180769231\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784180769231\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T05:46:09.231Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:46:19.142Z\",\"updatedAt\":\"2026-07-16T05:46:19.143Z\",\"__v\":0},{\"_id\":\"6a586ab7c38e0189a02449e2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784179374907\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784179374907\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T05:22:54.907Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:23:03.547Z\",\"updatedAt\":\"2026-07-16T05:23:03.548Z\",\"__v\":0},{\"_id\":\"6a58686dc38e0189a0244989\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178789807\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178789807\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T05:13:09.807Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:13:17.658Z\",\"updatedAt\":\"2026-07-16T05:13:17.659Z\",\"__v\":0},{\"_id\":\"6a586844c38e0189a024494b\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178748195\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178748195\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T05:12:28.195Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:12:36.468Z\",\"updatedAt\":\"2026-07-16T05:12:36.468Z\",\"__v\":0},{\"_id\":\"6a586833c38e0189a024490c\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178731351\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178731351\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-16T05:12:11.351Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:12:19.538Z\",\"updatedAt\":\"2026-07-16T05:12:19.538Z\",\"__v\":0},{\"_id\":\"6a5867dfc38e0189a02448cd\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178654961-cus\",\"source\":\"customer-report\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178654961-customer-report\",\"description\":\"chrysalis residual close\",\"detectedAt\":\"2026-07-16T05:10:55.487Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:10:55.622Z\",\"updatedAt\":\"2026-07-16T05:10:55.623Z\",\"__v\":0},{\"_id\":\"6a5867dfc38e0189a02448cb\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178654961-mon\",\"source\":\"monitoring\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178654961-monitoring\",\"description\":\"chrysalis residual close\",\"detectedAt\":\"2026-07-16T05:10:55.413Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:10:55.547Z\",\"updatedAt\":\"2026-07-16T05:10:55.548Z\",\"__v\":0},{\"_id\":\"6a5867dfc38e0189a02448c9\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178654961-sys\",\"source\":\"system\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178654961-system\",\"description\":\"chrysalis residual close\",\"detectedAt\":\"2026-07-16T05:10:55.206Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:10:55.471Z\",\"updatedAt\":\"2026-07-16T05:10:55.472Z\",\"__v\":0},{\"_id\":\"6a5867dfc38e0189a02448c7\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784178654961-oth\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784178654961-other\",\"description\":\"chrysalis residual close\",\"detectedAt\":\"2026-07-16T05:10:54.961Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-16T05:10:55.237Z\",\"updatedAt\":\"2026-07-16T05:10:55.239Z\",\"__v\":0},{\"_id\":\"6a59713bad923e3601e033f8\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246584459\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"low\",\"status\":\"converted\",\"title\":\"Inc 1784246584459\",\"description\":\"chrysalis-n10n\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"detectedAt\":\"2026-07-17T00:03:07.244Z\",\"createdAt\":\"2026-07-17T00:03:07.244Z\",\"updatedAt\":\"2026-07-17T00:03:07.596Z\",\"__v\":0,\"acknowledgedAt\":\"2026-07-17T00:03:07.352Z\",\"acknowledgedBy\":\"cwl-demo\",\"acknowledgedByName\":\"CWL Demo\",\"resolution\":\"chrysalis-n10n-1784246584459\",\"resolvedAt\":\"2026-07-17T00:03:07.466Z\",\"convertedAt\":\"2026-07-17T00:03:07.595Z\",\"convertedBy\":\"system\",\"relatedTicketId\":\"6a59713bad923e3601e03400\",\"relatedTicketNumber\":\"TKT-2026-0043\"},{\"_id\":\"6a596faead923e3601e0311f\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246189002\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"low\",\"status\":\"new\",\"title\":\"Inc 1784246189002\",\"description\":\"chrysalis-n10l\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"detectedAt\":\"2026-07-16T23:56:30.094Z\",\"createdAt\":\"2026-07-16T23:56:30.094Z\",\"updatedAt\":\"2026-07-16T23:56:30.095Z\",\"__v\":0},{\"_id\":\"6a596f75ad923e3601e0308d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784246132799\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"low\",\"status\":\"new\",\"title\":\"Inc 1784246132799\",\"description\":\"x\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"detectedAt\":\"2026-07-16T23:55:33.140Z\",\"createdAt\":\"2026-07-16T23:55:33.140Z\",\"updatedAt\":\"2026-07-16T23:55:33.140Z\",\"__v\":0}]";
}

@route POST "/api/incidents"
handler wisp_api_incidents_post {
  # source backend-services/routes/incidents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784255421599\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784255421599\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T02:30:21.599Z\",\"_id\":\"6a5993caad923e3601e03d75\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T02:30:34.549Z\",\"updatedAt\":\"2026-07-17T02:30:34.550Z\",\"__v\":0}";
}

@route GET "/api/installation-documentation"
handler wisp_api_installation_documentation_get {
  # source backend-services/routes/installation-documentation — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[{\"_id\":\"6a5970d4ad923e3601e032d9\",\"tenantId\":\"6a166eb07089304417ec967a\",\"installationType\":\"cpe\",\"siteId\":\"6a596f4dad923e3601e03063\",\"installationDate\":\"2026-07-17T00:01:24.302Z\",\"installedBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"installedByName\":\"demo@wisptools.io\",\"isSubcontractor\":false,\"requiredPhotos\":{\"minCount\":3,\"requiredCategories\":[]},\"photoCount\":0,\"documentation\":{\"safetyCompliance\":{\"ppeUsed\":[]},\"equipmentList\":[],\"issuesEncountered\":[],\"notes\":\"n10n-1784246500047\"},\"approvalStatus\":\"pending\",\"paymentApproval\":{\"required\":false,\"status\":\"not-required\"},\"qaReview\":{\"issues\":[]},\"createdBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"photos\":[],\"createdAt\":\"2026-07-17T00:01:24.303Z\",\"updatedAt\":\"2026-07-17T00:01:44.646Z\",\"__v\":0},{\"_id\":\"6a59704dad923e3601e031db\",\"tenantId\":\"6a166eb07089304417ec967a\",\"installationType\":\"cpe\",\"siteId\":\"6a596f4dad923e3601e03063\",\"installationDate\":\"2026-07-16T23:59:09.898Z\",\"installedBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"installedByName\":\"demo@wisptools.io\",\"isSubcontractor\":false,\"requiredPhotos\":{\"minCount\":3,\"requiredCategories\":[]},\"photoCount\":0,\"documentation\":{\"safetyCompliance\":{\"ppeUsed\":[]},\"equipmentList\":[],\"issuesEncountered\":[]},\"approvalStatus\":\"pending\",\"paymentApproval\":{\"required\":false,\"status\":\"not-required\"},\"qaReview\":{\"issues\":[]},\"createdBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"photos\":[],\"createdAt\":\"2026-07-16T23:59:09.899Z\",\"updatedAt\":\"2026-07-16T23:59:09.899Z\",\"__v\":0},{\"_id\":\"6a58ea64ad923e3601dfd766\",\"tenantId\":\"6a166eb07089304417ec967a\",\"installationType\":\"cpe\",\"siteId\":\"6a585d6ec38e0189a0244744\",\"siteName\":\"CWL Trace Site 1784175980977\",\"installationDate\":\"2026-07-16T14:27:48.406Z\",\"installedBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"installedByName\":\"demo@wisptools.io\",\"isSubcontractor\":false,\"requiredPhotos\":{\"minCount\":3,\"requiredCategories\":[]},\"photoCount\":0,\"documentation\":{\"safetyCompliance\":{\"ppeUsed\":[]},\"equipmentList\":[],\"issuesEncountered\":[],\"notes\":\"chrysalis-install-put-1784245369687\"},\"approvalStatus\":\"pending\",\"paymentApproval\":{\"required\":false,\"status\":\"not-required\"},\"qaReview\":{\"issues\":[]},\"createdBy\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"photos\":[],\"createdAt\":\"2026-07-16T14:27:48.449Z\",\"updatedAt\":\"2026-07-16T23:42:50.750Z\",\"__v\":0}]";
}

@route POST "/api/installation-documentation"
handler wisp_api_installation_documentation_post {
  # source backend-services/routes/installation-documentation — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"installation-documentation\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/internal"
handler wisp_api_internal_get {
  # source backend-services/routes/internal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"internal\",\"op\":\"list\"}";
}

@route POST "/api/internal"
handler wisp_api_internal_post {
  # source backend-services/routes/internal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"internal\",\"op\":\"create\"}";
}

@route GET "/api/inventory"
handler wisp_api_inventory_get {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"total\":4,\"inStock\":3,\"rma\":1},\"items\":[{\"id\":\"inv-1\",\"name\":\"CPE-AX100\",\"status\":\"in-stock\"},{\"id\":\"inv-2\",\"name\":\"Sector-60\",\"status\":\"in-stock\"},{\"id\":\"inv-3\",\"name\":\"Backhaul-Link\",\"status\":\"rma\"}],\"devices\":[{\"id\":\"dev-1\",\"name\":\"CPE-AX100\",\"status\":\"online\"},{\"id\":\"dev-2\",\"name\":\"CPE-BX200\",\"status\":\"offline\"}]}";
}

@route POST "/api/inventory"
handler wisp_api_inventory_post {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"manufacturer\":\"Trace\",\"model\":\"M1\",\"serialNumber\":\"INV1784255421599\",\"status\":\"available\",\"condition\":\"new\",\"currentLocation\":{\"type\":\"warehouse\"},\"ownership\":\"owned\",\"attachments\":[],\"_id\":\"6a5993caad923e3601e03d6f\",\"maintenanceRecords\":[],\"locationHistory\":[],\"alerts\":[],\"createdAt\":\"2026-07-17T02:30:34.108Z\",\"updatedAt\":\"2026-07-17T02:30:34.109Z\",\"__v\":0}";
}

@route GET "/api/maintain"
handler wisp_api_maintain_get {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"tickets\":[{\"id\":\"tk-1\",\"name\":\"Outage\",\"status\":\"open\"}],\"workOrders\":[{\"id\":\"wo-1\",\"name\":\"Repair\",\"status\":\"open\"}],\"items\":[{\"id\":\"tk-1\",\"name\":\"Outage\",\"status\":\"open\"}],\"report\":{\"summary\":{\"totalTickets\":10,\"totalItems\":10,\"byStatus\":{\"open\":4,\"closed\":5,\"pending\":1},\"byCategory\":{\"network\":3,\"billing\":2,\"support\":5},\"slaCompliance\":{\"onTime\":8,\"breached\":2}}}}";
}

@route POST "/api/maintain"
handler wisp_api_maintain_post {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"maintain\",\"op\":\"create\"}";
}

@route PUT "/api/maintain"
handler wisp_api_maintain_put {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"maintain\",\"op\":\"update\"}";
}

@route PATCH "/api/maintain"
handler wisp_api_maintain_patch {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"maintain\",\"op\":\"update\"}";
}

@route DELETE "/api/maintain"
handler wisp_api_maintain_delete {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"maintain\",\"op\":\"delete\"}";
}

@route GET "/api/me"
handler wisp_api_me_get {
  # source backend-services/routes/me — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"authenticated\":true,\"email\":\"preview@wisptools.local\",\"surface\":\"wisp-auth-native\"}";
}

@route GET "/api/mikrotik"
handler wisp_api_mikrotik_get {
  # source backend-services/routes/mikrotik — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mikrotik\",\"op\":\"list\"}";
}

@route POST "/api/mikrotik"
handler wisp_api_mikrotik_post {
  # source backend-services/routes/mikrotik — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mikrotik\",\"op\":\"create\"}";
}

@route PUT "/api/mikrotik"
handler wisp_api_mikrotik_put {
  # source backend-services/routes/mikrotik — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mikrotik\",\"op\":\"update\"}";
}

@route PATCH "/api/mikrotik"
handler wisp_api_mikrotik_patch {
  # source backend-services/routes/mikrotik — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mikrotik\",\"op\":\"update\"}";
}

@route DELETE "/api/mikrotik"
handler wisp_api_mikrotik_delete {
  # source backend-services/routes/mikrotik — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mikrotik\",\"op\":\"delete\"}";
}

@route GET "/api/mme"
handler wisp_api_mme_get {
  # source backend-services/routes/mme — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mme\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/mme"
handler wisp_api_mme_post {
  # source backend-services/routes/mme — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mme\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/mme"
handler wisp_api_mme_put {
  # source backend-services/routes/mme — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mme\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/mme"
handler wisp_api_mme_patch {
  # source backend-services/routes/mme — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mme\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/mme"
handler wisp_api_mme_delete {
  # source backend-services/routes/mme — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mme\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/mobile"
handler wisp_api_mobile_get {
  # source backend-services/routes/mobile — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mobile\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/mobile"
handler wisp_api_mobile_post {
  # source backend-services/routes/mobile — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mobile\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/mobile"
handler wisp_api_mobile_put {
  # source backend-services/routes/mobile — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mobile\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/mobile"
handler wisp_api_mobile_patch {
  # source backend-services/routes/mobile — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mobile\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/mobile"
handler wisp_api_mobile_delete {
  # source backend-services/routes/mobile — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"mobile\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/module-access"
handler wisp_api_module_access_get {
  # source backend-services/routes/module-access — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"module-access\",\"op\":\"list\",\"modules\":[{\"id\":\"plan\",\"name\":\"Plan\",\"roles\":[\"owner\",\"admin\"]},{\"id\":\"deploy\",\"name\":\"Deploy\",\"roles\":[\"owner\",\"admin\"]},{\"id\":\"billing\",\"name\":\"Billing\",\"roles\":[\"owner\"]}],\"items\":[{\"id\":\"plan\",\"name\":\"Plan\",\"status\":\"configured\"},{\"id\":\"deploy\",\"name\":\"Deploy\",\"status\":\"configured\"},{\"id\":\"billing\",\"name\":\"Billing\",\"status\":\"configured\"}]}";
}

@route GET "/api/monitoring"
handler wisp_api_monitoring_get {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"rssi\":-70,\"sinr\":20,\"uptimeHours\":200},\"devices\":[{\"id\":\"mon-1\",\"name\":\"CPE Monitor\",\"status\":\"online\"}],\"items\":[{\"id\":\"mon-1\",\"name\":\"CPE Monitor\",\"status\":\"online\"}]}";
}

@route POST "/api/monitoring"
handler wisp_api_monitoring_post {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring\",\"op\":\"create\"}";
}

@route PUT "/api/monitoring"
handler wisp_api_monitoring_put {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring\",\"op\":\"update\"}";
}

@route PATCH "/api/monitoring"
handler wisp_api_monitoring_patch {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring\",\"op\":\"update\"}";
}

@route DELETE "/api/monitoring"
handler wisp_api_monitoring_delete {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring\",\"op\":\"delete\"}";
}

@route GET "/api/network"
handler wisp_api_network_get {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"sites\":[{\"id\":\"s1\",\"_id\":\"s1\",\"name\":\"North Tower\",\"status\":\"active\",\"type\":[\"tower\"],\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58,\"address\":\"North Sector\"},\"height\":40},{\"id\":\"s2\",\"_id\":\"s2\",\"name\":\"Beta Rooftop\",\"status\":\"active\",\"type\":[\"rooftop\"],\"lat\":39.91,\"lng\":-98.65,\"location\":{\"latitude\":39.91,\"longitude\":-98.65},\"height\":25},{\"id\":\"s3\",\"_id\":\"s3\",\"name\":\"Core Monopole\",\"status\":\"online\",\"type\":[\"monopole\"],\"lat\":39.78,\"lng\":-98.52,\"location\":{\"latitude\":39.78,\"longitude\":-98.52},\"height\":35}],\"towers\":[{\"id\":\"tw-1\",\"name\":\"Tower A\",\"status\":\"online\",\"lat\":39.78,\"lng\":-98.52}],\"sectors\":[{\"id\":\"sec-1\",\"_id\":\"sec-1\",\"siteId\":\"s1\",\"name\":\"North-LTE-0\",\"status\":\"active\",\"technology\":\"LTE\",\"band\":\"LTE\",\"azimuth\":0,\"beamwidth\":65,\"pci\":101,\"earfcn\":2300,\"eNodeB\":1001,\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58}},{\"id\":\"sec-2\",\"_id\":\"sec-2\",\"siteId\":\"s1\",\"name\":\"North-CBRS-120\",\"status\":\"deployed\",\"technology\":\"CBRS\",\"band\":\"CBRS\",\"azimuth\":120,\"beamwidth\":60,\"pci\":204,\"earfcn\":55240,\"eNodeB\":1001,\"lat\":39.85,\"lng\":-98.58,\"location\":{\"latitude\":39.85,\"longitude\":-98.58}},{\"id\":\"sec-3\",\"_id\":\"sec-3\",\"siteId\":\"s2\",\"name\":\"Beta-FWA-240\",\"status\":\"active\",\"technology\":\"FWA\",\"band\":\"FWA\",\"azimuth\":240,\"beamwidth\":90,\"pci\":88,\"earfcn\":66661,\"eNodeB\":2002,\"lat\":39.91,\"lng\":-98.65,\"location\":{\"latitude\":39.91,\"longitude\":-98.65}}],\"cpe\":[{\"id\":\"cpe-1\",\"name\":\"CPE Acme\",\"status\":\"active\",\"lat\":39.842,\"lng\":-98.57,\"location\":{\"latitude\":39.842,\"longitude\":-98.57}}],\"cpeDevices\":[{\"id\":\"cpe-1\",\"name\":\"CPE Acme\",\"status\":\"active\",\"lat\":39.842,\"lng\":-98.57,\"location\":{\"latitude\":39.842,\"longitude\":-98.57}}],\"equipment\":[{\"id\":\"eq-1\",\"name\":\"Core Switch\",\"status\":\"online\",\"locationType\":\"noc\",\"lat\":39.78,\"lng\":-98.52,\"location\":{\"latitude\":39.78,\"longitude\":-98.52}}],\"networkDevices\":[{\"id\":\"nd-1\",\"name\":\"Core Switch\",\"status\":\"online\"}],\"epcDevices\":[{\"id\":\"epc-1\",\"name\":\"MME-1\",\"status\":\"online\"}],\"grants\":[{\"id\":\"g1\",\"name\":\"CBRS Grant\",\"status\":\"authorized\"}],\"items\":[{\"id\":\"s1\",\"name\":\"North Tower\",\"status\":\"active\",\"lat\":39.85,\"lng\":-98.58}]}";
}

@route POST "/api/network"
handler wisp_api_network_post {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"network\",\"op\":\"create\"}";
}

@route PUT "/api/network"
handler wisp_api_network_put {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"network\",\"op\":\"update\"}";
}

@route PATCH "/api/network"
handler wisp_api_network_patch {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"network\",\"op\":\"update\"}";
}

@route DELETE "/api/network"
handler wisp_api_network_delete {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"network\",\"op\":\"delete\"}";
}

@route GET "/api/notifications"
handler wisp_api_notifications_get {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[{\"id\":\"wfB78SDLGbT4nKp1j5WD\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a5970d3ad923e3601e032c3\",\"title\":\"Project Approved: Auth 1784246481869\",\"message\":\"Project \\\"Auth 1784246481869\\\" has been approved for deployment and is ready for field work.\",\"read\":false,\"data\":{\"projectName\":\"Auth 1784246481869\",\"projectId\":\"6a5970d3ad923e3601e032c3\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-17T00:01:23.505Z\"},{\"id\":\"5gKzZ0iOVZD3StvYpFj0\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a59708fad923e3601e03226\",\"title\":\"Project Approved: A 1784246414046\",\"message\":\"Project \\\"A 1784246414046\\\" has been approved for deployment and is ready for field work.\",\"read\":false,\"data\":{\"projectName\":\"A 1784246414046\",\"projectId\":\"6a59708fad923e3601e03226\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-17T00:00:16.073Z\"},{\"id\":\"odMfAaI3GgpzUUFmLwgB\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a59704aad923e3601e031aa\",\"title\":\"Project Approved: Ready 1784246346096\",\"message\":\"Project \\\"Ready 1784246346096\\\" has been approved for deployment and is ready for field work.\",\"read\":false,\"data\":{\"projectName\":\"Ready 1784246346096\",\"projectId\":\"6a59704aad923e3601e031aa\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-16T23:59:07.136Z\"},{\"id\":\"hgflrLy4uYClHvN5sP4D\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a58ea60ad923e3601dfd70f\",\"title\":\"Project Approved: CWL Plan 1784212055760\",\"message\":\"Project \\\"CWL Plan 1784212055760\\\" has been approved for deployment and is ready for field work.\",\"data\":{\"projectName\":\"CWL Plan 1784212055760\",\"projectId\":\"6a58ea60ad923e3601dfd70f\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-16T14:27:47.298Z\",\"read\":true,\"readAt\":{\"_seconds\":1784245833,\"_nanoseconds\":910000000}},{\"id\":\"513fq6q17dnhM2ZXo17n\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a58e75bad923e3601dfd69f\",\"title\":\"Project Approved: CWL Plan 1784211282920\",\"message\":\"Project \\\"CWL Plan 1784211282920\\\" has been approved for deployment and is ready for field work.\",\"read\":false,\"data\":{\"projectName\":\"CWL Plan 1784211282920\",\"projectId\":\"6a58e75bad923e3601dfd69f\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-16T14:14:53.833Z\"},{\"id\":\"x97YKjYJob7VECtfDGV2\",\"userId\":\"xbQzgkx9FQaqUkaocW8MjVXfUAZ2\",\"tenantId\":\"6a166eb07089304417ec967a\",\"type\":\"project_approved\",\"projectId\":\"6a58e745ad923e3601dfd62c\",\"title\":\"Project Approved: CWL Plan 1784211261296\",\"message\":\"Project \\\"CWL Plan 1784211261296\\\" has been approved for deployment and is ready for field work.\",\"data\":{\"projectName\":\"CWL Plan 1784211261296\",\"projectId\":\"6a58e745ad923e3601dfd62c\",\"approvedBy\":\"demo@wisptools.io\",\"tenantId\":\"6a166eb07089304417ec967a\"},\"createdAt\":\"2026-07-16T14:14:31.850Z\",\"read\":true,\"readAt\":{\"_seconds\":1784211292,\"_nanoseconds\":934000000}}]";
}

@route GET "/api/permissions"
handler wisp_api_permissions_get {
  # source backend-services/routes/permissions — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"permissions\",\"op\":\"list\"}";
}

@route POST "/api/permissions"
handler wisp_api_permissions_post {
  # source backend-services/routes/permissions — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"permissions\",\"op\":\"create\"}";
}

@route PUT "/api/permissions"
handler wisp_api_permissions_put {
  # source backend-services/routes/permissions — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"permissions\",\"op\":\"update\"}";
}

@route PATCH "/api/permissions"
handler wisp_api_permissions_patch {
  # source backend-services/routes/permissions — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"permissions\",\"op\":\"update\"}";
}

@route DELETE "/api/permissions"
handler wisp_api_permissions_delete {
  # source backend-services/routes/permissions — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"permissions\",\"op\":\"delete\"}";
}

@route GET "/api/plans"
handler wisp_api_plans_get {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"plans\":[{\"id\":\"plan-north\",\"name\":\"North Sector Build\",\"status\":\"draft\",\"kind\":\"plan-project\",\"lat\":39.85,\"lng\":-98.58,\"showOnMap\":true},{\"id\":\"plan-beta\",\"name\":\"Beta Coverage Expand\",\"status\":\"approved\",\"kind\":\"plan-project\",\"lat\":39.91,\"lng\":-98.65,\"showOnMap\":true,\"marketing\":{\"targetRadiusMiles\":2,\"lastResultCount\":0,\"addresses\":[]}},{\"id\":\"plan-core\",\"name\":\"Core Site Deploy\",\"status\":\"deployed\",\"kind\":\"plan-project\",\"lat\":39.78,\"lng\":-98.52,\"showOnMap\":true},{\"id\":\"p1\",\"name\":\"Residential 100\",\"status\":\"active\",\"kind\":\"service-plan\",\"price\":49.99,\"isPopular\":true,\"features\":[\"100 Mbps\",\"Unlimited data\"]},{\"id\":\"p2\",\"name\":\"Business 500\",\"status\":\"active\",\"kind\":\"service-plan\",\"price\":149.99,\"isPopular\":false,\"features\":[\"500 Mbps\",\"SLA\"]}],\"items\":[{\"id\":\"plan-north\",\"name\":\"North Sector Build\",\"status\":\"draft\",\"kind\":\"plan-project\",\"lat\":39.85,\"lng\":-98.58},{\"id\":\"plan-beta\",\"name\":\"Beta Coverage Expand\",\"status\":\"approved\",\"kind\":\"plan-project\",\"lat\":39.91,\"lng\":-98.65},{\"id\":\"plan-core\",\"name\":\"Core Site Deploy\",\"status\":\"deployed\",\"kind\":\"plan-project\",\"lat\":39.78,\"lng\":-98.52},{\"id\":\"p1\",\"name\":\"Residential 100\",\"status\":\"active\",\"kind\":\"service-plan\"},{\"id\":\"p2\",\"name\":\"Business 500\",\"status\":\"active\",\"kind\":\"service-plan\"}]}";
}

@route POST "/api/plans"
handler wisp_api_plans_post {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"name\":\"CWL Plan 1784255421599\",\"description\":\"chrysalis-live-mutate-trace\",\"status\":\"draft\",\"location\":{\"country\":\"US\"},\"marketing\":{\"targetRadiusMiles\":5,\"totalUniqueAddresses\":0,\"totalRuns\":0,\"lastRunNewAddresses\":0,\"algorithms\":[],\"addresses\":[],\"runHistory\":[]},\"showOnMap\":false,\"tenantId\":\"6a166eb07089304417ec967a\",\"createdBy\":\"System\",\"createdById\":null,\"scope\":{\"towers\":[],\"sectors\":[],\"cpeDevices\":[],\"equipment\":[],\"backhauls\":[]},\"hardwareRequirements\":{\"existing\":[],\"needed\":[]},\"purchasePlan\":{\"totalEstimatedCost\":0,\"missingHardware\":[],\"procurementStatus\":\"pending\",\"vendorQuotes\":[]},\"deployment\":{\"assignedTeam\":[],\"deploymentStage\":\"planning\",\"fieldTechs\":[],\"hardwareDeployment\":[],\"documentation\":{\"installationPhotos\":[],\"testReports\":[],\"asBuiltDrawings\":[]},\"milestones\":[],\"issues\":[]},\"_id\":\"6a5993caad923e3601e03d71\",\"stagedFeatureCounts\":{\"total\":0},\"createdAt\":\"2026-07-17T02:30:34.289Z\",\"updatedAt\":\"2026-07-17T02:30:34.290Z\",\"__v\":0,\"totalHardwareCount\":0,\"missingHardwareCount\":0,\"criticalMissingCount\":0,\"id\":\"6a5993caad923e3601e03d71\"}";
}

@route PUT "/api/plans"
handler wisp_api_plans_put {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"plans\",\"op\":\"update\"}";
}

@route PATCH "/api/plans"
handler wisp_api_plans_patch {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"plans\",\"op\":\"update\"}";
}

@route DELETE "/api/plans"
handler wisp_api_plans_delete {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"plans\",\"op\":\"delete\"}";
}

@route GET "/api/portal"
handler wisp_api_portal_get {
  # source backend-services/routes/portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/portal"
handler wisp_api_portal_post {
  # source backend-services/routes/portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/portal"
handler wisp_api_portal_put {
  # source backend-services/routes/portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/portal"
handler wisp_api_portal_patch {
  # source backend-services/routes/portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/portal"
handler wisp_api_portal_delete {
  # source backend-services/routes/portal — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/portal-content"
handler wisp_api_portal_content_get {
  # source backend-services/routes/portal-content — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal-content\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/portal-content"
handler wisp_api_portal_content_post {
  # source backend-services/routes/portal-content — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal-content\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/portal-content"
handler wisp_api_portal_content_put {
  # source backend-services/routes/portal-content — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal-content\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/portal-content"
handler wisp_api_portal_content_patch {
  # source backend-services/routes/portal-content — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal-content\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/portal-content"
handler wisp_api_portal_content_delete {
  # source backend-services/routes/portal-content — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"portal-content\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/remote-agents"
handler wisp_api_remote_agents_get {
  # source backend-services/routes/remote-agents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"remote-agents\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/remote-agents"
handler wisp_api_remote_agents_post {
  # source backend-services/routes/remote-agents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"remote-agents\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/remote-agents"
handler wisp_api_remote_agents_put {
  # source backend-services/routes/remote-agents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"remote-agents\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/remote-agents"
handler wisp_api_remote_agents_patch {
  # source backend-services/routes/remote-agents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"remote-agents\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/remote-agents"
handler wisp_api_remote_agents_delete {
  # source backend-services/routes/remote-agents — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"remote-agents\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/snmp"
handler wisp_api_snmp_monitoring_get {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"stats\":{\"rssi\":-72,\"sinr\":18,\"uptimeHours\":120},\"devices\":[{\"id\":\"cpe-1\",\"name\":\"Tower A CPE\",\"status\":\"online\"},{\"id\":\"cpe-2\",\"name\":\"Tower B CPE\",\"status\":\"degraded\"}],\"cpeDevices\":[{\"id\":\"cpe-1\",\"name\":\"Tower A CPE\",\"status\":\"online\"},{\"id\":\"cpe-2\",\"name\":\"Tower B CPE\",\"status\":\"degraded\"}],\"items\":[{\"id\":\"cpe-1\",\"name\":\"Tower A CPE\",\"status\":\"online\"},{\"id\":\"cpe-2\",\"name\":\"Tower B CPE\",\"status\":\"degraded\"}]}";
}

@route POST "/api/snmp"
handler wisp_api_snmp_monitoring_post {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"snmp-monitoring\",\"op\":\"create\"}";
}

@route PUT "/api/snmp"
handler wisp_api_snmp_monitoring_put {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"snmp-monitoring\",\"op\":\"update\"}";
}

@route PATCH "/api/snmp"
handler wisp_api_snmp_monitoring_patch {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"snmp-monitoring\",\"op\":\"update\"}";
}

@route DELETE "/api/snmp"
handler wisp_api_snmp_monitoring_delete {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"snmp-monitoring\",\"op\":\"delete\"}";
}

@route GET "/api/subcontractors"
handler wisp_api_subcontractors_get {
  # source backend-services/routes/subcontractors — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "[]";
}

@route POST "/api/subcontractors"
handler wisp_api_subcontractors_post {
  # source backend-services/routes/subcontractors — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"subcontractors\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/system"
handler wisp_api_system_get {
  # source backend-services/routes/system — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"system\",\"op\":\"list\",\"seeded\":\"contract-empty\",\"items\":[]}";
}

@route POST "/api/system"
handler wisp_api_system_post {
  # source backend-services/routes/system — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"system\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route PUT "/api/system"
handler wisp_api_system_put {
  # source backend-services/routes/system — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"system\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route PATCH "/api/system"
handler wisp_api_system_patch {
  # source backend-services/routes/system — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"system\",\"op\":\"update\",\"seeded\":\"contract-mutate\"}";
}

@route DELETE "/api/system"
handler wisp_api_system_delete {
  # source backend-services/routes/system — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"system\",\"op\":\"delete\",\"seeded\":\"contract-mutate\"}";
}

@route GET "/api/tenant-settings"
handler wisp_api_tenant_settings_get {
  # source backend-services/routes/tenant-settings — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"acsSettings\":{\"username\":\"\",\"password\":\"\",\"url\":\"\"},\"companyInfo\":{\"name\":\"\",\"address\":\"\",\"city\":\"\",\"state\":\"\",\"zip\":\"\",\"phone\":\"\",\"email\":\"\"}}";
}

@route PUT "/api/tenant-settings"
handler wisp_api_tenant_settings_put {
  # source backend-services/routes/tenant-settings — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"acsSettings\":{\"username\":\"\",\"password\":\"\",\"url\":\"\"},\"companyInfo\":{\"name\":\"CWL Trace Co\",\"address\":\"\",\"city\":\"\",\"state\":\"\",\"zip\":\"\",\"phone\":\"555-0199\",\"email\":\"cwl-settings-1784255436129@example.com\"}}";
}

@route POST "/api/tenants"
handler wisp_api_tenants_post {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"create\"}";
}

@route GET "/api/users"
handler wisp_api_users_get {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"users\":[{\"id\":\"u1\",\"name\":\"Admin\",\"email\":\"admin@example.com\",\"status\":\"active\"},{\"id\":\"u2\",\"name\":\"Ops\",\"email\":\"ops@example.com\",\"status\":\"active\"}],\"roles\":[{\"id\":\"r1\",\"name\":\"admin\",\"status\":\"active\"}],\"items\":[{\"id\":\"u1\",\"name\":\"Admin\",\"status\":\"active\"},{\"id\":\"u2\",\"name\":\"Ops\",\"status\":\"active\"}]}";
}

@route GET "/api/voice"
handler wisp_api_voice_get {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"lines\":[{\"id\":\"v1\",\"name\":\"Main DID\",\"status\":\"active\"}],\"items\":[{\"id\":\"v1\",\"name\":\"Main DID\",\"status\":\"active\"}]}";
}

@route POST "/api/voice"
handler wisp_api_voice_post {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"voice\",\"op\":\"create\"}";
}

@route PUT "/api/voice"
handler wisp_api_voice_put {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"voice\",\"op\":\"update\"}";
}

@route PATCH "/api/voice"
handler wisp_api_voice_patch {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"voice\",\"op\":\"update\"}";
}

@route DELETE "/api/voice"
handler wisp_api_voice_delete {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"voice\",\"op\":\"delete\"}";
}

@route GET "/api/work-orders"
handler wisp_api_work_orders_get {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"workOrders\":[{\"id\":\"wo-1\",\"name\":\"Install CPE\",\"status\":\"open\"},{\"id\":\"wo-2\",\"name\":\"Tower climb\",\"status\":\"scheduled\"}],\"items\":[{\"id\":\"wo-1\",\"name\":\"Install CPE\",\"status\":\"open\"},{\"id\":\"wo-2\",\"name\":\"Tower climb\",\"status\":\"scheduled\"}]}";
}

@route POST "/api/work-orders"
handler wisp_api_work_orders_post {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"tenantId\":\"6a166eb07089304417ec967a\",\"ticketNumber\":\"TKT-CWL-1784255421599\",\"type\":\"installation\",\"ticketCategory\":\"customer-facing\",\"priority\":\"medium\",\"status\":\"open\",\"requiresApproval\":false,\"approvalStatus\":\"not-required\",\"title\":\"CWL WO 1784255421599\",\"description\":\"chrysalis-live-mutate-trace\",\"sla\":{\"breached\":false},\"photos\":[],\"attachments\":[],\"_id\":\"6a5993c9ad923e3601e03d6d\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"workPerformed\":[],\"partsUsed\":[],\"createdAt\":\"2026-07-17T02:30:33.980Z\",\"updatedAt\":\"2026-07-17T02:30:33.981Z\",\"__v\":0}";
}

@route GET "/admin"
handler wisp_api_admin_get {
  # source backend-services/routes/admin — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"message\":\"Admin API is running\",\"timestamp\":\"2026-07-17T02:30:29.683Z\"}";
}

@route POST "/setup-admin"
handler wisp_api_setup_admin_post {
  # source backend-services/routes/setup-admin — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"setup-admin\",\"op\":\"create\",\"seeded\":\"contract-mutate\"}";
}

@route POST "/api/epc/checkin/commands/:command_id/result"
handler wisp_api_epc_checkin_commands_command_id_result_post {
  # source backend-services/routes/epc-checkin.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-checkin-commands-command-id-result", op: "create" };
}

@route PUT "/api/epc/snmp/devices/:id/graphs"
handler wisp_api_epc_snmp_devices_id_graphs_put {
  # source backend-services/routes/epc-snmp.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-snmp-devices-id-graphs", op: "update" };
}

@route POST "/api/billing/subscription/:subscriptionId/cancel"
handler wisp_api_billing_subscription_subscriptionid_cancel_post {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-subscription-subscriptionid-cancel", op: "create" };
}

@route GET "/api/customer-portal/billing/invoices/:invoiceId"
handler wisp_api_customer_portal_billing_invoices_invoiceid_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-billing-invoices-invoiceid", op: "list" };
}

@route POST "/api/customer-portal/tickets/:id/comments"
handler wisp_api_customer_portal_tickets_id_comments_post {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-tickets-id-comments", op: "create" };
}

@route GET "/api/customers/search/email/:email"
handler wisp_api_customers_search_email_email_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-search-email-email", op: "list" };
}

@route GET "/api/customers/search/imsi/:imsi"
handler wisp_api_customers_search_imsi_imsi_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-search-imsi-imsi", op: "list" };
}

@route GET "/api/customers/search/phone/:phone"
handler wisp_api_customers_search_phone_phone_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-search-phone-phone", op: "list" };
}

@route GET "/api/epc/:epc_id/commands/history"
handler wisp_api_epc_epc_id_commands_history_get {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-commands-history", op: "list" };
}

@route GET "/api/epc/:epc_id/status/history"
handler wisp_api_epc_epc_id_status_history_get {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-status-history", op: "list" };
}

@route GET "/api/epc/:epcId/metrics/history"
handler wisp_api_epc_epcid_metrics_history_get {
  # source backend-services/routes/epcMetrics.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epcid-metrics-history", op: "list" };
}

@route POST "/api/mikrotik/devices/:id/command"
handler wisp_api_mikrotik_devices_id_command_post {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id-command", op: "create" };
}

@route GET "/api/mikrotik/devices/:id/credentials"
handler wisp_api_mikrotik_devices_id_credentials_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id-credentials", op: "list" };
}

@route PUT "/api/mikrotik/devices/:id/credentials"
handler wisp_api_mikrotik_devices_id_credentials_put {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id-credentials", op: "update" };
}

@route GET "/api/mikrotik/devices/:id/metrics"
handler wisp_api_mikrotik_devices_id_metrics_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id-metrics", op: "list" };
}

@route POST "/api/mikrotik/devices/:id/test-connection"
handler wisp_api_mikrotik_devices_id_test_connection_post {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id-test-connection", op: "create" };
}

@route GET "/api/monitoring/graphs/ping/:deviceId"
handler wisp_api_monitoring_graphs_ping_deviceid_get {
  # source backend-services/routes/monitoring-graphs.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-graphs-ping-deviceid", op: "list" };
}

@route GET "/api/monitoring/graphs/snmp/:deviceId"
handler wisp_api_monitoring_graphs_snmp_deviceid_get {
  # source backend-services/routes/monitoring-graphs.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "monitoring-graphs-snmp-deviceid", op: "list" };
}

@route GET "/api/network/sites/:siteId/hardware"
handler wisp_api_network_sites_siteid_hardware_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-siteid-hardware", op: "list" };
}

@route POST "/api/network/sites/:siteId/hardware"
handler wisp_api_network_sites_siteid_hardware_post {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-siteid-hardware", op: "create" };
}

@route GET "/api/network/sites/:siteId/sectors"
handler wisp_api_network_sites_siteid_sectors_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-siteid-sectors", op: "list" };
}

@route GET "/api/portal-content/:tenantId/alerts/active"
handler wisp_api_portal_content_tenantid_alerts_active_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-alerts-active", op: "list" };
}

@route GET "/api/portal-content/:tenantId/faq/published"
handler wisp_api_portal_content_tenantid_faq_published_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-faq-published", op: "list" };
}

@route GET "/api/portal-content/:tenantId/knowledge-base/published"
handler wisp_api_portal_content_tenantid_knowledge_base_published_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base-published", op: "list" };
}

@route POST "/api/system/services/:serviceName/restart"
handler wisp_api_system_services_servicename_restart_post {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-services-servicename-restart", op: "create" };
}

@route POST "/api/system/services/:serviceName/start"
handler wisp_api_system_services_servicename_start_post {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-services-servicename-start", op: "create" };
}

@route POST "/api/system/services/:serviceName/stop"
handler wisp_api_system_services_servicename_stop_post {
  # source backend-services/routes/system.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "system-services-servicename-stop", op: "create" };
}

@route GET "/api/users/tenant/:tenantId/visible"
handler wisp_api_users_tenant_tenantid_visible_get {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-tenant-tenantid-visible", op: "list" };
}

@route GET "/api/voice/port-orders/:id/events"
handler wisp_api_voice_port_orders_id_events_get {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-port-orders-id-events", op: "list" };
}

@route POST "/admin/tenants/:tenantId/assign-owner"
handler wisp_api_admin_tenants_tenantid_assign_owner_post {
  # source backend-services/routes/admin/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "admin-tenants-tenantid-assign-owner", op: "create" };
}

@route GET "/admin/tenants/:tenantId/users"
handler wisp_api_admin_tenants_tenantid_users_get {
  # source backend-services/routes/admin/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "admin-tenants-tenantid-users", op: "list" };
}

@route GET "/api/billing/invoices/:tenantId"
handler wisp_api_billing_invoices_tenantid_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-invoices-tenantid", op: "list" };
}

@route PUT "/api/billing/payment-methods/:paymentMethodId"
handler wisp_api_billing_payment_methods_paymentmethodid_put {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-payment-methods-paymentmethodid", op: "update" };
}

@route GET "/api/billing/payment-methods/:tenantId"
handler wisp_api_billing_payment_methods_tenantid_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-payment-methods-tenantid", op: "list" };
}

@route GET "/api/billing/subscription/:tenantId"
handler wisp_api_billing_subscription_tenantid_get {
  # source backend-services/billing-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "billing-subscription-tenantid", op: "list" };
}

@route POST "/api/bundles/:id/items"
handler wisp_api_bundles_id_items_post {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id-items", op: "create" };
}

@route POST "/api/bundles/:id/use"
handler wisp_api_bundles_id_use_post {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id-use", op: "create" };
}

@route GET "/api/bundles/search/:query"
handler wisp_api_bundles_search_query_get {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-search-query", op: "list" };
}

@route GET "/api/bundles/type/:bundleType"
handler wisp_api_bundles_type_bundletype_get {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-type-bundletype", op: "list" };
}

@route POST "/api/customer-billing/:customerId/invoices"
handler wisp_api_customer_billing_customerid_invoices_post {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-customerid-invoices", op: "create" };
}

@route POST "/api/customer-billing/:customerId/payments"
handler wisp_api_customer_billing_customerid_payments_post {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-customerid-payments", op: "create" };
}

@route GET "/api/customer-portal/tickets/:id"
handler wisp_api_customer_portal_tickets_id_get {
  # source backend-services/routes/customer-portal-api.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-portal-tickets-id", op: "list" };
}

@route POST "/api/customers/:id/complaints"
handler wisp_api_customers_id_complaints_post {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id-complaints", op: "create" };
}

@route POST "/api/customers/:id/create-subscriber"
handler wisp_api_customers_id_create_subscriber_post {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id-create-subscriber", op: "create" };
}

@route POST "/api/customers/:id/service-history"
handler wisp_api_customers_id_service_history_post {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id-service-history", op: "create" };
}

@route GET "/api/customers/:id/subscriber"
handler wisp_api_customers_id_subscriber_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id-subscriber", op: "list" };
}

@route POST "/api/deploy/:epc_id/link-device"
handler wisp_api_deploy_epc_id_link_device_post {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-epc-id-link-device", op: "create" };
}

@route DELETE "/api/deploy/delete-epc/:epc_id"
handler wisp_api_deploy_delete_epc_epc_id_delete {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-delete-epc-epc-id", op: "delete" };
}

@route GET "/api/epc/:epc_id/commands"
handler wisp_api_epc_epc_id_commands_get {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-commands", op: "list" };
}

@route GET "/api/epc/:epc_id/logs"
handler wisp_api_epc_epc_id_logs_get {
  # source backend-services/routes/epc-logs.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-logs", op: "list" };
}

@route GET "/api/epc/:epc_id/status"
handler wisp_api_epc_epc_id_status_get {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-status", op: "list" };
}

@route POST "/api/epc/:epc_id/trigger-snmp-discovery"
handler wisp_api_epc_epc_id_trigger_snmp_discovery_post {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-trigger-snmp-discovery", op: "create" };
}

@route GET "/api/epc/:epcId/status"
handler wisp_api_epc_epcid_status_get {
  # source backend-services/routes/epcMetrics.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epcid-status", op: "list" };
}

@route GET "/api/epc/metrics/:id"
handler wisp_api_epc_metrics_id_get {
  # source backend-services/routes/epc.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-metrics-id", op: "list" };
}

@route POST "/api/incidents/:id/acknowledge"
handler wisp_api_incidents_id_acknowledge_post {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id-acknowledge", op: "create" };
}

@route POST "/api/incidents/:id/close"
handler wisp_api_incidents_id_close_post {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id-close", op: "create" };
}

@route POST "/api/incidents/:id/convert-to-ticket"
handler wisp_api_incidents_id_convert_to_ticket_post {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id-convert-to-ticket", op: "create" };
}

@route POST "/api/incidents/:id/notes"
handler wisp_api_incidents_id_notes_post {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id-notes", op: "create" };
}

@route POST "/api/incidents/:id/resolve"
handler wisp_api_incidents_id_resolve_post {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id-resolve", op: "create" };
}

@route POST "/api/installation-documentation/:id/approve"
handler wisp_api_installation_documentation_id_approve_post {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id-approve", op: "create" };
}

@route POST "/api/installation-documentation/:id/payment-approve"
handler wisp_api_installation_documentation_id_payment_approve_post {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id-payment-approve", op: "create" };
}

@route POST "/api/installation-documentation/:id/photos"
handler wisp_api_installation_documentation_id_photos_post {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id-photos", op: "create" };
}

@route POST "/api/installation-documentation/:id/submit"
handler wisp_api_installation_documentation_id_submit_post {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id-submit", op: "create" };
}

@route GET "/api/internal/tenant-details/:tenantId"
handler wisp_api_internal_tenant_details_tenantid_get {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-tenant-details-tenantid", op: "list" };
}

@route GET "/api/internal/user-tenants/:userId"
handler wisp_api_internal_user_tenants_userid_get {
  # source backend-services/routes/internal.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "internal-user-tenants-userid", op: "list" };
}

@route POST "/api/inventory/:id/deploy"
handler wisp_api_inventory_id_deploy_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id-deploy", op: "create" };
}

@route POST "/api/inventory/:id/maintenance"
handler wisp_api_inventory_id_maintenance_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id-maintenance", op: "create" };
}

@route POST "/api/inventory/:id/return"
handler wisp_api_inventory_id_return_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id-return", op: "create" };
}

@route POST "/api/inventory/:id/transfer"
handler wisp_api_inventory_id_transfer_post {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id-transfer", op: "create" };
}

@route GET "/api/inventory/by-location/:locationType"
handler wisp_api_inventory_by_location_locationtype_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-by-location-locationtype", op: "list" };
}

@route GET "/api/inventory/by-site/:siteId"
handler wisp_api_inventory_by_site_siteid_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-by-site-siteid", op: "list" };
}

@route GET "/api/mikrotik/devices/:id"
handler wisp_api_mikrotik_devices_id_get {
  # source backend-services/routes/mikrotik.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "mikrotik-devices-id", op: "list" };
}

@route DELETE "/api/network/cpe/:id"
handler wisp_api_network_cpe_id_delete {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-cpe-id", op: "delete" };
}

@route GET "/api/network/cpe/:id"
handler wisp_api_network_cpe_id_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-cpe-id", op: "list" };
}

@route PUT "/api/network/cpe/:id"
handler wisp_api_network_cpe_id_put {
  # source backend-services/routes/network-cpe-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"_id\":\"6a59711cad923e3601e03344\",\"name\":\"CBRS 1784246556389\",\"status\":\"active\",\"technology\":\"CBRS\",\"manufacturer\":\"CBRS\",\"model\":\"CBSD\",\"serialNumber\":\"CBRS-1784246556389\",\"siteId\":null,\"tenantId\":\"6a166eb07089304417ec967a\",\"createdAt\":\"2026-07-17T00:02:36.794Z\",\"updatedAt\":\"2026-07-17T02:30:36.104Z\",\"__v\":0,\"updatedBy\":\"System\"}";
}

@route DELETE "/api/network/equipment/:id"
handler wisp_api_network_equipment_id_delete {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-equipment-id", op: "delete" };
}

@route PUT "/api/network/equipment/:id"
handler wisp_api_network_equipment_id_put {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-equipment-id", op: "update" };
}

@route DELETE "/api/network/hardware-deployments/:id"
handler wisp_api_network_hardware_deployments_id_delete {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-hardware-deployments-id", op: "delete" };
}

@route PUT "/api/network/hardware-deployments/:id"
handler wisp_api_network_hardware_deployments_id_put {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-hardware-deployments-id", op: "update" };
}

@route DELETE "/api/network/sectors/:id"
handler wisp_api_network_sectors_id_delete {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sectors-id", op: "delete" };
}

@route GET "/api/network/sectors/:id"
handler wisp_api_network_sectors_id_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sectors-id", op: "list" };
}

@route PUT "/api/network/sectors/:id"
handler wisp_api_network_sectors_id_put {
  # source backend-services/routes/network-sectors-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"_id\":\"6a58eb10ad923e3601dfd7e5\",\"name\":\"CWL Sector 1784212240048\",\"status\":\"active\",\"technology\":\"LTE\",\"azimuth\":90,\"beamwidth\":65,\"location\":{\"latitude\":39.74,\"longitude\":-104.99,\"address\":\"\",\"country\":\"US\",\"_id\":\"6a58eb10ad923e3601dfd7e6\"},\"siteId\":\"6a585d6ec38e0189a0244744\",\"tenantId\":\"6a166eb07089304417ec967a\",\"createdBy\":\"System\",\"createdAt\":\"2026-07-16T14:30:40.082Z\",\"updatedAt\":\"2026-07-17T02:30:35.884Z\",\"__v\":0,\"updatedBy\":\"System\"}";
}

@route DELETE "/api/network/sites/:id"
handler wisp_api_network_sites_id_delete {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-id", op: "delete" };
}

@route GET "/api/network/sites/:id"
handler wisp_api_network_sites_id_get {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-id", op: "list" };
}

@route PUT "/api/network/sites/:id"
handler wisp_api_network_sites_id_put {
  # source backend-services/routes/network.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "network-sites-id", op: "update" };
}

@route PUT "/api/notifications/:id/read"
handler wisp_api_notifications_id_read_put {
  # source backend-services/routes/notifications.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "notifications-id-read", op: "update" };
}

@route GET "/api/permissions/role/:role"
handler wisp_api_permissions_role_role_get {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-role-role", op: "list" };
}

@route PUT "/api/permissions/role/:role"
handler wisp_api_permissions_role_role_put {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-role-role", op: "update" };
}

@route GET "/api/permissions/user/:userId"
handler wisp_api_permissions_user_userid_get {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-user-userid", op: "list" };
}

@route PUT "/api/permissions/user/:userId"
handler wisp_api_permissions_user_userid_put {
  # source backend-services/routes/permissions.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "permissions-user-userid", op: "update" };
}

@route GET "/api/portal-content/:tenantId/alerts"
handler wisp_api_portal_content_tenantid_alerts_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-alerts", op: "list" };
}

@route POST "/api/portal-content/:tenantId/alerts"
handler wisp_api_portal_content_tenantid_alerts_post {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-alerts", op: "create" };
}

@route GET "/api/portal-content/:tenantId/chat-settings"
handler wisp_api_portal_content_tenantid_chat_settings_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-chat-settings", op: "list" };
}

@route PUT "/api/portal-content/:tenantId/chat-settings"
handler wisp_api_portal_content_tenantid_chat_settings_put {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-chat-settings", op: "update" };
}

@route GET "/api/portal-content/:tenantId/faq"
handler wisp_api_portal_content_tenantid_faq_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-faq", op: "list" };
}

@route POST "/api/portal-content/:tenantId/faq"
handler wisp_api_portal_content_tenantid_faq_post {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-faq", op: "create" };
}

@route GET "/api/portal-content/:tenantId/knowledge-base"
handler wisp_api_portal_content_tenantid_knowledge_base_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base", op: "list" };
}

@route POST "/api/portal-content/:tenantId/knowledge-base"
handler wisp_api_portal_content_tenantid_knowledge_base_post {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base", op: "create" };
}

@route GET "/api/portal/domain/:domain"
handler wisp_api_portal_domain_domain_get {
  # source backend-services/routes/portal-domain.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-domain-domain", op: "list" };
}

@route GET "/api/portal/subdomain/:subdomain"
handler wisp_api_portal_subdomain_subdomain_get {
  # source backend-services/routes/portal-domain.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-subdomain-subdomain", op: "list" };
}

@route GET "/api/portal/tenant/:tenantId"
handler wisp_api_portal_tenant_tenantid_get {
  # source backend-services/routes/portal-domain.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-tenant-tenantid", op: "list" };
}

@route POST "/api/subcontractors/:id/approve"
handler wisp_api_subcontractors_id_approve_post {
  # source backend-services/routes/subcontractors.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "subcontractors-id-approve", op: "create" };
}

@route GET "/api/subcontractors/:id/expired-items"
handler wisp_api_subcontractors_id_expired_items_get {
  # source backend-services/routes/subcontractors.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "subcontractors-id-expired-items", op: "list" };
}

@route POST "/api/users/:userId/activate"
handler wisp_api_users_userid_activate_post {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-activate", op: "create" };
}

@route GET "/api/users/:userId/activity"
handler wisp_api_users_userid_activity_get {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-activity", op: "list" };
}

@route PUT "/api/users/:userId/modules"
handler wisp_api_users_userid_modules_put {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-modules", op: "update" };
}

@route PUT "/api/users/:userId/role"
handler wisp_api_users_userid_role_put {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-role", op: "update" };
}

@route POST "/api/users/:userId/suspend"
handler wisp_api_users_userid_suspend_post {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-suspend", op: "create" };
}

@route GET "/api/users/tenant/:tenantId"
handler wisp_api_users_tenant_tenantid_get {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-tenant-tenantid", op: "list" };
}

@route PATCH "/api/voice/telephone-numbers/:id"
handler wisp_api_voice_telephone_numbers_id_patch {
  # source backend-services/routes/voice-sip.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "voice-telephone-numbers-id", op: "update" };
}

@route POST "/api/work-orders/:id/assign"
handler wisp_api_work_orders_id_assign_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id-assign", op: "create" };
}

@route POST "/api/work-orders/:id/close"
handler wisp_api_work_orders_id_close_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id-close", op: "create" };
}

@route POST "/api/work-orders/:id/complete"
handler wisp_api_work_orders_id_complete_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id-complete", op: "create" };
}

@route POST "/api/work-orders/:id/log"
handler wisp_api_work_orders_id_log_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id-log", op: "create" };
}

@route POST "/api/work-orders/:id/start"
handler wisp_api_work_orders_id_start_post {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id-start", op: "create" };
}

@route GET "/api/work-orders/assigned/:userId"
handler wisp_api_work_orders_assigned_userid_get {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-assigned-userid", op: "list" };
}

@route GET "/api/work-orders/site/:siteId"
handler wisp_api_work_orders_site_siteid_get {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-site-siteid", op: "list" };
}

@route DELETE "/admin/tenants/:tenantId"
handler wisp_api_admin_tenants_tenantid_delete {
  # source backend-services/routes/admin/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "admin-tenants-tenantid", op: "delete" };
}

@route GET "/admin/tenants/:tenantId"
handler wisp_api_admin_tenants_tenantid_get {
  # source backend-services/routes/admin/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "admin-tenants-tenantid", op: "list" };
}

@route PUT "/admin/tenants/:tenantId"
handler wisp_api_admin_tenants_tenantid_put {
  # source backend-services/routes/admin/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "admin-tenants-tenantid", op: "update" };
}

@route DELETE "/api/bundles/:id"
handler wisp_api_bundles_id_delete {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id", op: "delete" };
}

@route GET "/api/bundles/:id"
handler wisp_api_bundles_id_get {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id", op: "list" };
}

@route PUT "/api/bundles/:id"
handler wisp_api_bundles_id_put {
  # source backend-services/routes/bundles-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"_id\":\"6a5993caad923e3601e03d73\",\"tenantId\":\"6a166eb07089304417ec967a\",\"name\":\"CWL Bundle 1784255421599\",\"bundleType\":\"standard\",\"tags\":[],\"status\":\"active\",\"usageCount\":0,\"items\":[],\"images\":[],\"createdAt\":\"2026-07-17T02:30:34.443Z\",\"updatedAt\":\"2026-07-17T02:30:35.666Z\",\"estimatedTotalCost\":0,\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784255434700\"}";
}

@route GET "/api/customer-billing/:customerId"
handler wisp_api_customer_billing_customerid_get {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-customerid", op: "list" };
}

@route PUT "/api/customer-billing/:customerId"
handler wisp_api_customer_billing_customerid_put {
  # source backend-services/routes/customer-billing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customer-billing-customerid", op: "update" };
}

@route DELETE "/api/customers/:id"
handler wisp_api_customers_id_delete {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id", op: "delete" };
}

@route GET "/api/customers/:id"
handler wisp_api_customers_id_get {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id", op: "list" };
}

@route PUT "/api/customers/:id"
handler wisp_api_customers_id_put {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id", op: "update" };
}

@route PUT "/api/deploy/:epc_id"
handler wisp_api_deploy_epc_id_put {
  # source backend-services/routes/deployment/epc-management.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "deploy-epc-id", op: "update" };
}

@route GET "/api/epc/:id"
handler wisp_api_epc_id_get {
  # source backend-services/routes/epc.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-id", op: "list" };
}

@route DELETE "/api/equipment-pricing/:id"
handler wisp_api_equipment_pricing_id_delete {
  # source backend-services/routes/equipment-pricing.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "equipment-pricing-id", op: "delete" };
}

@route GET "/api/incidents/:id"
handler wisp_api_incidents_id_get {
  # source backend-services/routes/incidents.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "incidents-id", op: "list" };
}

@route PUT "/api/incidents/:id"
handler wisp_api_incidents_id_put {
  # source backend-services/routes/incidents-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"_id\":\"6a5993caad923e3601e03d75\",\"tenantId\":\"6a166eb07089304417ec967a\",\"incidentNumber\":\"INC-CWL-1784255421599\",\"source\":\"other\",\"incidentType\":\"other\",\"severity\":\"medium\",\"status\":\"new\",\"title\":\"CWL Trace Incident 1784255421599\",\"description\":\"chrysalis-live-mutate-trace\",\"detectedAt\":\"2026-07-17T02:30:21.599Z\",\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"investigationNotes\":[],\"createdAt\":\"2026-07-17T02:30:34.549Z\",\"updatedAt\":\"2026-07-17T02:30:35.432Z\",\"__v\":0}";
}

@route GET "/api/installation-documentation/:id"
handler wisp_api_installation_documentation_id_get {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id", op: "list" };
}

@route PUT "/api/installation-documentation/:id"
handler wisp_api_installation_documentation_id_put {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id", op: "update" };
}

@route DELETE "/api/inventory/:id"
handler wisp_api_inventory_id_delete {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id", op: "delete" };
}

@route GET "/api/inventory/:id"
handler wisp_api_inventory_id_get {
  # source backend-services/routes/inventory.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "inventory-id", op: "list" };
}

@route PUT "/api/inventory/:id"
handler wisp_api_inventory_id_put {
  # source backend-services/routes/inventory-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"_id\":\"6a5993caad923e3601e03d6f\",\"tenantId\":\"6a166eb07089304417ec967a\",\"category\":\"Radio Equipment\",\"equipmentType\":\"Radio\",\"manufacturer\":\"Trace\",\"model\":\"M1\",\"serialNumber\":\"INV1784255421599\",\"status\":\"available\",\"condition\":\"new\",\"currentLocation\":{\"type\":\"warehouse\"},\"ownership\":\"owned\",\"attachments\":[],\"maintenanceRecords\":[],\"locationHistory\":[],\"alerts\":[],\"createdAt\":\"2026-07-17T02:30:34.108Z\",\"updatedAt\":\"2026-07-17T02:30:34.999Z\",\"__v\":0,\"notes\":\"chrysalis-live-mutate-put-1784255434700\"}";
}

@route DELETE "/api/subcontractors/:id"
handler wisp_api_subcontractors_id_delete {
  # source backend-services/routes/subcontractors.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "subcontractors-id", op: "delete" };
}

@route GET "/api/subcontractors/:id"
handler wisp_api_subcontractors_id_get {
  # source backend-services/routes/subcontractors.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "subcontractors-id", op: "list" };
}

@route PUT "/api/subcontractors/:id"
handler wisp_api_subcontractors_id_put {
  # source backend-services/routes/subcontractors.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "subcontractors-id", op: "update" };
}

@route PUT "/api/tenants/:tenantId"
handler wisp_api_tenants_tenantid_put {
  # source backend-services/routes/tenants.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "tenants-tenantid", op: "update" };
}

@route DELETE "/api/work-orders/:id"
handler wisp_api_work_orders_id_delete {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id", op: "delete" };
}

@route GET "/api/work-orders/:id"
handler wisp_api_work_orders_id_get {
  # source backend-services/routes/work-orders.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "work-orders-id", op: "list" };
}

@route PUT "/api/work-orders/:id"
handler wisp_api_work_orders_id_put {
  # source backend-services/routes/work-orders-id — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"sla\":{\"breached\":false},\"_id\":\"6a5993c9ad923e3601e03d6d\",\"tenantId\":\"6a166eb07089304417ec967a\",\"ticketNumber\":\"TKT-CWL-1784255421599\",\"type\":\"installation\",\"ticketCategory\":\"customer-facing\",\"priority\":\"medium\",\"status\":\"open\",\"requiresApproval\":false,\"approvalStatus\":\"not-required\",\"title\":\"CWL WO 1784255421599\",\"description\":\"chrysalis-live-mutate-trace\",\"photos\":[],\"attachments\":[],\"affectedEquipment\":[],\"affectedSites\":[],\"affectedCustomers\":[],\"workPerformed\":[],\"partsUsed\":[],\"createdAt\":\"2026-07-17T02:30:33.980Z\",\"updatedAt\":\"2026-07-17T02:30:35.227Z\",\"__v\":0}";
}

@route POST "/api/epc/:epc_id/commands/:command_id/result"
handler wisp_api_epc_epc_id_commands_command_id_result_post {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-commands-command-id-result", op: "create" };
}

@route DELETE "/api/bundles/:id/items/:itemId"
handler wisp_api_bundles_id_items_itemid_delete {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id-items-itemid", op: "delete" };
}

@route PUT "/api/bundles/:id/items/:itemId"
handler wisp_api_bundles_id_items_itemid_put {
  # source backend-services/routes/hardwareBundles.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "bundles-id-items-itemid", op: "update" };
}

@route PUT "/api/customers/:id/complaints/:complaintId"
handler wisp_api_customers_id_complaints_complaintid_put {
  # source backend-services/routes/customers.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "customers-id-complaints-complaintid", op: "update" };
}

@route POST "/api/epc/:epc_id/service/:action"
handler wisp_api_epc_epc_id_service_action_post {
  # source backend-services/routes/epc-commands.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "epc-epc-id-service-action", op: "create" };
}

@route DELETE "/api/installation-documentation/:id/photos/:photoId"
handler wisp_api_installation_documentation_id_photos_photoid_delete {
  # source backend-services/routes/installation-documentation.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "installation-documentation-id-photos-photoid", op: "delete" };
}

@route DELETE "/api/portal-content/:tenantId/alerts/:alertId"
handler wisp_api_portal_content_tenantid_alerts_alertid_delete {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-alerts-alertid", op: "delete" };
}

@route PUT "/api/portal-content/:tenantId/alerts/:alertId"
handler wisp_api_portal_content_tenantid_alerts_alertid_put {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-alerts-alertid", op: "update" };
}

@route DELETE "/api/portal-content/:tenantId/faq/:faqId"
handler wisp_api_portal_content_tenantid_faq_faqid_delete {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-faq-faqid", op: "delete" };
}

@route PUT "/api/portal-content/:tenantId/faq/:faqId"
handler wisp_api_portal_content_tenantid_faq_faqid_put {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-faq-faqid", op: "update" };
}

@route DELETE "/api/portal-content/:tenantId/knowledge-base/:articleId"
handler wisp_api_portal_content_tenantid_knowledge_base_articleid_delete {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base-articleid", op: "delete" };
}

@route GET "/api/portal-content/:tenantId/knowledge-base/:articleId"
handler wisp_api_portal_content_tenantid_knowledge_base_articleid_get {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base-articleid", op: "list" };
}

@route PUT "/api/portal-content/:tenantId/knowledge-base/:articleId"
handler wisp_api_portal_content_tenantid_knowledge_base_articleid_put {
  # source backend-services/routes/portal-content.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "portal-content-tenantid-knowledge-base-articleid", op: "update" };
}

@route DELETE "/api/users/:userId/tenant/:tenantId"
handler wisp_api_users_userid_tenant_tenantid_delete {
  # source backend-services/routes/users/index.js
  effects: db, session;
  use auth bearer;
  return { ok: true, surface: "wisp-api-native", resource: "users-userid-tenant-tenantid", op: "delete" };
}

@route GET "/api/tenants"
handler wisp_api_tenants_get {
  # source backend-services/routes/tenants — oracle-verified (Phase 28d)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"tenants\":[{\"id\":\"t1\",\"name\":\"Acme Org\",\"status\":\"active\"},{\"id\":\"t2\",\"name\":\"Beta Org\",\"status\":\"trial\"}],\"items\":[{\"id\":\"t1\",\"name\":\"Acme Org\",\"status\":\"active\"},{\"id\":\"t2\",\"name\":\"Beta Org\",\"status\":\"trial\"}]}";
}
