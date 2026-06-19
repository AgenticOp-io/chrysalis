# WISP API upstream proxy contract — Phase 12
# Runnable via wisp-cwl-chimera-gateway (hub-cwl:upstream-proxy until runtime-cwl native proxy).
module wisp_api;

@route GET "/api/plans"
handler wisp_api_plans_get {
  effects: upstream backend;
  upstream-path "/api/plans";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/plans"
handler wisp_api_plans_post {
  effects: upstream backend;
  upstream-path "/api/plans";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/plans"
handler wisp_api_plans_put {
  effects: upstream backend;
  upstream-path "/api/plans";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/plans"
handler wisp_api_plans_patch {
  effects: upstream backend;
  upstream-path "/api/plans";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/plans"
handler wisp_api_plans_delete {
  effects: upstream backend;
  upstream-path "/api/plans";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/network"
handler wisp_api_network_get {
  effects: upstream backend;
  upstream-path "/api/network";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/network"
handler wisp_api_network_post {
  effects: upstream backend;
  upstream-path "/api/network";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/network"
handler wisp_api_network_put {
  effects: upstream backend;
  upstream-path "/api/network";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/network"
handler wisp_api_network_patch {
  effects: upstream backend;
  upstream-path "/api/network";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/network"
handler wisp_api_network_delete {
  effects: upstream backend;
  upstream-path "/api/network";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/customers"
handler wisp_api_customers_get {
  effects: upstream backend;
  upstream-path "/api/customers";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/customers"
handler wisp_api_customers_post {
  effects: upstream backend;
  upstream-path "/api/customers";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/customers"
handler wisp_api_customers_put {
  effects: upstream backend;
  upstream-path "/api/customers";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/customers"
handler wisp_api_customers_patch {
  effects: upstream backend;
  upstream-path "/api/customers";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/customers"
handler wisp_api_customers_delete {
  effects: upstream backend;
  upstream-path "/api/customers";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/customer-billing"
handler wisp_api_customer_billing_get {
  effects: upstream backend;
  upstream-path "/api/customer-billing";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/customer-billing"
handler wisp_api_customer_billing_post {
  effects: upstream backend;
  upstream-path "/api/customer-billing";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/customer-billing"
handler wisp_api_customer_billing_put {
  effects: upstream backend;
  upstream-path "/api/customer-billing";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/customer-billing"
handler wisp_api_customer_billing_patch {
  effects: upstream backend;
  upstream-path "/api/customer-billing";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/customer-billing"
handler wisp_api_customer_billing_delete {
  effects: upstream backend;
  upstream-path "/api/customer-billing";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/inventory"
handler wisp_api_inventory_get {
  effects: upstream backend;
  upstream-path "/api/inventory";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/inventory"
handler wisp_api_inventory_post {
  effects: upstream backend;
  upstream-path "/api/inventory";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/inventory"
handler wisp_api_inventory_put {
  effects: upstream backend;
  upstream-path "/api/inventory";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/inventory"
handler wisp_api_inventory_patch {
  effects: upstream backend;
  upstream-path "/api/inventory";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/inventory"
handler wisp_api_inventory_delete {
  effects: upstream backend;
  upstream-path "/api/inventory";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/bundles"
handler wisp_api_bundles_get {
  effects: upstream backend;
  upstream-path "/api/bundles";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/bundles"
handler wisp_api_bundles_post {
  effects: upstream backend;
  upstream-path "/api/bundles";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/bundles"
handler wisp_api_bundles_put {
  effects: upstream backend;
  upstream-path "/api/bundles";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/bundles"
handler wisp_api_bundles_patch {
  effects: upstream backend;
  upstream-path "/api/bundles";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/bundles"
handler wisp_api_bundles_delete {
  effects: upstream backend;
  upstream-path "/api/bundles";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/deploy"
handler wisp_api_deploy_get {
  effects: upstream backend;
  upstream-path "/api/deploy";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/deploy"
handler wisp_api_deploy_post {
  effects: upstream backend;
  upstream-path "/api/deploy";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/deploy"
handler wisp_api_deploy_put {
  effects: upstream backend;
  upstream-path "/api/deploy";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/deploy"
handler wisp_api_deploy_patch {
  effects: upstream backend;
  upstream-path "/api/deploy";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/deploy"
handler wisp_api_deploy_delete {
  effects: upstream backend;
  upstream-path "/api/deploy";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/hss"
handler wisp_api_hss_get {
  effects: upstream backend;
  upstream-path "/api/hss";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/hss"
handler wisp_api_hss_post {
  effects: upstream backend;
  upstream-path "/api/hss";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/hss"
handler wisp_api_hss_put {
  effects: upstream backend;
  upstream-path "/api/hss";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/hss"
handler wisp_api_hss_patch {
  effects: upstream backend;
  upstream-path "/api/hss";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/hss"
handler wisp_api_hss_delete {
  effects: upstream backend;
  upstream-path "/api/hss";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/monitoring"
handler wisp_api_monitoring_get {
  effects: upstream backend;
  upstream-path "/api/monitoring";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/monitoring"
handler wisp_api_monitoring_post {
  effects: upstream backend;
  upstream-path "/api/monitoring";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/monitoring"
handler wisp_api_monitoring_put {
  effects: upstream backend;
  upstream-path "/api/monitoring";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/monitoring"
handler wisp_api_monitoring_patch {
  effects: upstream backend;
  upstream-path "/api/monitoring";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/monitoring"
handler wisp_api_monitoring_delete {
  effects: upstream backend;
  upstream-path "/api/monitoring";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/maintain"
handler wisp_api_maintain_get {
  effects: upstream backend;
  upstream-path "/api/maintain";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/maintain"
handler wisp_api_maintain_post {
  effects: upstream backend;
  upstream-path "/api/maintain";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/maintain"
handler wisp_api_maintain_put {
  effects: upstream backend;
  upstream-path "/api/maintain";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/maintain"
handler wisp_api_maintain_patch {
  effects: upstream backend;
  upstream-path "/api/maintain";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/maintain"
handler wisp_api_maintain_delete {
  effects: upstream backend;
  upstream-path "/api/maintain";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/tenants"
handler wisp_api_tenants_get {
  effects: upstream backend;
  upstream-path "/api/tenants";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/tenants"
handler wisp_api_tenants_post {
  effects: upstream backend;
  upstream-path "/api/tenants";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/tenants"
handler wisp_api_tenants_put {
  effects: upstream backend;
  upstream-path "/api/tenants";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/tenants"
handler wisp_api_tenants_patch {
  effects: upstream backend;
  upstream-path "/api/tenants";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/tenants"
handler wisp_api_tenants_delete {
  effects: upstream backend;
  upstream-path "/api/tenants";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/users"
handler wisp_api_users_get {
  effects: upstream backend;
  upstream-path "/api/users";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/users"
handler wisp_api_users_post {
  effects: upstream backend;
  upstream-path "/api/users";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/users"
handler wisp_api_users_put {
  effects: upstream backend;
  upstream-path "/api/users";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/users"
handler wisp_api_users_patch {
  effects: upstream backend;
  upstream-path "/api/users";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/users"
handler wisp_api_users_delete {
  effects: upstream backend;
  upstream-path "/api/users";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/work-orders"
handler wisp_api_work_orders_get {
  effects: upstream backend;
  upstream-path "/api/work-orders";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/work-orders"
handler wisp_api_work_orders_post {
  effects: upstream backend;
  upstream-path "/api/work-orders";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/work-orders"
handler wisp_api_work_orders_put {
  effects: upstream backend;
  upstream-path "/api/work-orders";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/work-orders"
handler wisp_api_work_orders_patch {
  effects: upstream backend;
  upstream-path "/api/work-orders";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/work-orders"
handler wisp_api_work_orders_delete {
  effects: upstream backend;
  upstream-path "/api/work-orders";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/permissions"
handler wisp_api_permissions_get {
  effects: upstream backend;
  upstream-path "/api/permissions";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/permissions"
handler wisp_api_permissions_post {
  effects: upstream backend;
  upstream-path "/api/permissions";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/permissions"
handler wisp_api_permissions_put {
  effects: upstream backend;
  upstream-path "/api/permissions";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/permissions"
handler wisp_api_permissions_patch {
  effects: upstream backend;
  upstream-path "/api/permissions";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/permissions"
handler wisp_api_permissions_delete {
  effects: upstream backend;
  upstream-path "/api/permissions";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/mikrotik"
handler wisp_api_mikrotik_get {
  effects: upstream backend;
  upstream-path "/api/mikrotik";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/mikrotik"
handler wisp_api_mikrotik_post {
  effects: upstream backend;
  upstream-path "/api/mikrotik";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/mikrotik"
handler wisp_api_mikrotik_put {
  effects: upstream backend;
  upstream-path "/api/mikrotik";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/mikrotik"
handler wisp_api_mikrotik_patch {
  effects: upstream backend;
  upstream-path "/api/mikrotik";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/mikrotik"
handler wisp_api_mikrotik_delete {
  effects: upstream backend;
  upstream-path "/api/mikrotik";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/epc-updates"
handler wisp_api_epc_updates_get {
  effects: upstream backend;
  upstream-path "/api/epc-updates";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/epc-updates"
handler wisp_api_epc_updates_post {
  effects: upstream backend;
  upstream-path "/api/epc-updates";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/epc-updates"
handler wisp_api_epc_updates_put {
  effects: upstream backend;
  upstream-path "/api/epc-updates";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/epc-updates"
handler wisp_api_epc_updates_patch {
  effects: upstream backend;
  upstream-path "/api/epc-updates";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/epc-updates"
handler wisp_api_epc_updates_delete {
  effects: upstream backend;
  upstream-path "/api/epc-updates";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/snmp"
handler wisp_api_snmp_monitoring_get {
  effects: upstream backend;
  upstream-path "/api/snmp";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/snmp"
handler wisp_api_snmp_monitoring_post {
  effects: upstream backend;
  upstream-path "/api/snmp";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/snmp"
handler wisp_api_snmp_monitoring_put {
  effects: upstream backend;
  upstream-path "/api/snmp";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/snmp"
handler wisp_api_snmp_monitoring_patch {
  effects: upstream backend;
  upstream-path "/api/snmp";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/snmp"
handler wisp_api_snmp_monitoring_delete {
  effects: upstream backend;
  upstream-path "/api/snmp";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/monitoring/graphs"
handler wisp_api_monitoring_graphs_get {
  effects: upstream backend;
  upstream-path "/api/monitoring/graphs";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/monitoring/graphs"
handler wisp_api_monitoring_graphs_post {
  effects: upstream backend;
  upstream-path "/api/monitoring/graphs";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/device-assignment"
handler wisp_api_device_assignment_get {
  effects: upstream backend;
  upstream-path "/api/device-assignment";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/device-assignment"
handler wisp_api_device_assignment_post {
  effects: upstream backend;
  upstream-path "/api/device-assignment";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/device-assignment"
handler wisp_api_device_assignment_put {
  effects: upstream backend;
  upstream-path "/api/device-assignment";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/device-assignment"
handler wisp_api_device_assignment_patch {
  effects: upstream backend;
  upstream-path "/api/device-assignment";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/device-assignment"
handler wisp_api_device_assignment_delete {
  effects: upstream backend;
  upstream-path "/api/device-assignment";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/notifications"
handler wisp_api_notifications_get {
  effects: upstream backend;
  upstream-path "/api/notifications";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/notifications"
handler wisp_api_notifications_post {
  effects: upstream backend;
  upstream-path "/api/notifications";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/notifications"
handler wisp_api_notifications_put {
  effects: upstream backend;
  upstream-path "/api/notifications";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/notifications"
handler wisp_api_notifications_patch {
  effects: upstream backend;
  upstream-path "/api/notifications";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/notifications"
handler wisp_api_notifications_delete {
  effects: upstream backend;
  upstream-path "/api/notifications";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/voice"
handler wisp_api_voice_get {
  effects: upstream backend;
  upstream-path "/api/voice";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/voice"
handler wisp_api_voice_post {
  effects: upstream backend;
  upstream-path "/api/voice";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/voice"
handler wisp_api_voice_put {
  effects: upstream backend;
  upstream-path "/api/voice";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/voice"
handler wisp_api_voice_patch {
  effects: upstream backend;
  upstream-path "/api/voice";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/voice"
handler wisp_api_voice_delete {
  effects: upstream backend;
  upstream-path "/api/voice";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/admin"
handler wisp_api_admin_prefix_get {
  effects: upstream backend;
  upstream-path "/api/admin";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/admin"
handler wisp_api_admin_prefix_post {
  effects: upstream backend;
  upstream-path "/api/admin";
  hole hub-cwl:upstream-proxy;
}

@route PUT "/api/admin"
handler wisp_api_admin_prefix_put {
  effects: upstream backend;
  upstream-path "/api/admin";
  hole hub-cwl:upstream-proxy;
}

@route PATCH "/api/admin"
handler wisp_api_admin_prefix_patch {
  effects: upstream backend;
  upstream-path "/api/admin";
  hole hub-cwl:upstream-proxy;
}

@route DELETE "/api/admin"
handler wisp_api_admin_prefix_delete {
  effects: upstream backend;
  upstream-path "/api/admin";
  hole hub-cwl:upstream-proxy;
}

@route GET "/api/internal"
handler wisp_api_internal_get {
  effects: upstream backend;
  upstream-path "/api/internal";
  hole hub-cwl:upstream-proxy;
}

@route POST "/api/internal"
handler wisp_api_internal_post {
  effects: upstream backend;
  upstream-path "/api/internal";
  hole hub-cwl:upstream-proxy;
}

@route ANY "/api/*"
handler wisp_api_catchall {
  effects: upstream backend;
  upstream-path "/api";
  hole hub-cwl:upstream-proxy;
}
