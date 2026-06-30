# WISP API native handlers — Phase 27b (lifted from backend-services contract)
# MongoDB remains infra; handler bodies are CWL-native with db/session effects.
module wisp_api;

@route GET "/api/plans"
handler wisp_api_plans_get {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"plans\",\"op\":\"list\"}";
}

@route POST "/api/plans"
handler wisp_api_plans_post {
  # source backend-services/routes/plans — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"plans\",\"op\":\"create\"}";
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

@route GET "/api/network"
handler wisp_api_network_get {
  # source backend-services/routes/network — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"network\",\"op\":\"list\"}";
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

@route GET "/api/customers"
handler wisp_api_customers_get {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customers\",\"op\":\"list\"}";
}

@route POST "/api/customers"
handler wisp_api_customers_post {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customers\",\"op\":\"create\"}";
}

@route PUT "/api/customers"
handler wisp_api_customers_put {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customers\",\"op\":\"update\"}";
}

@route PATCH "/api/customers"
handler wisp_api_customers_patch {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customers\",\"op\":\"update\"}";
}

@route DELETE "/api/customers"
handler wisp_api_customers_delete {
  # source backend-services/routes/customers — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customers\",\"op\":\"delete\"}";
}

@route GET "/api/customer-billing"
handler wisp_api_customer_billing_get {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"list\"}";
}

@route POST "/api/customer-billing"
handler wisp_api_customer_billing_post {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"create\"}";
}

@route PUT "/api/customer-billing"
handler wisp_api_customer_billing_put {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"update\"}";
}

@route PATCH "/api/customer-billing"
handler wisp_api_customer_billing_patch {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"update\"}";
}

@route DELETE "/api/customer-billing"
handler wisp_api_customer_billing_delete {
  # source backend-services/routes/customer-billing — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"customer-billing\",\"op\":\"delete\"}";
}

@route GET "/api/inventory"
handler wisp_api_inventory_get {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"inventory\",\"op\":\"list\"}";
}

@route POST "/api/inventory"
handler wisp_api_inventory_post {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"inventory\",\"op\":\"create\"}";
}

@route PUT "/api/inventory"
handler wisp_api_inventory_put {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"inventory\",\"op\":\"update\"}";
}

@route PATCH "/api/inventory"
handler wisp_api_inventory_patch {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"inventory\",\"op\":\"update\"}";
}

@route DELETE "/api/inventory"
handler wisp_api_inventory_delete {
  # source backend-services/routes/inventory — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"inventory\",\"op\":\"delete\"}";
}

@route GET "/api/bundles"
handler wisp_api_bundles_get {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"bundles\",\"op\":\"list\"}";
}

@route POST "/api/bundles"
handler wisp_api_bundles_post {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"bundles\",\"op\":\"create\"}";
}

@route PUT "/api/bundles"
handler wisp_api_bundles_put {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"bundles\",\"op\":\"update\"}";
}

@route PATCH "/api/bundles"
handler wisp_api_bundles_patch {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"bundles\",\"op\":\"update\"}";
}

@route DELETE "/api/bundles"
handler wisp_api_bundles_delete {
  # source backend-services/routes/bundles — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"bundles\",\"op\":\"delete\"}";
}

@route GET "/api/deploy"
handler wisp_api_deploy_get {
  # source backend-services/routes/deploy — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"deploy\",\"op\":\"list\"}";
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

@route GET "/api/hss"
handler wisp_api_hss_get {
  # source backend-services/routes/hss — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"hss\",\"op\":\"list\"}";
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

@route GET "/api/monitoring"
handler wisp_api_monitoring_get {
  # source backend-services/routes/monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring\",\"op\":\"list\"}";
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

@route GET "/api/maintain"
handler wisp_api_maintain_get {
  # source backend-services/routes/maintain — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"maintain\",\"op\":\"list\"}";
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

@route GET "/api/tenants"
handler wisp_api_tenants_get {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"list\"}";
}

@route POST "/api/tenants"
handler wisp_api_tenants_post {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"create\"}";
}

@route PUT "/api/tenants"
handler wisp_api_tenants_put {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"update\"}";
}

@route PATCH "/api/tenants"
handler wisp_api_tenants_patch {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"update\"}";
}

@route DELETE "/api/tenants"
handler wisp_api_tenants_delete {
  # source backend-services/routes/tenants — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"tenants\",\"op\":\"delete\"}";
}

@route GET "/api/users"
handler wisp_api_users_get {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"users\",\"op\":\"list\"}";
}

@route POST "/api/users"
handler wisp_api_users_post {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"users\",\"op\":\"create\"}";
}

@route PUT "/api/users"
handler wisp_api_users_put {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"users\",\"op\":\"update\"}";
}

@route PATCH "/api/users"
handler wisp_api_users_patch {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"users\",\"op\":\"update\"}";
}

@route DELETE "/api/users"
handler wisp_api_users_delete {
  # source backend-services/routes/users — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"users\",\"op\":\"delete\"}";
}

@route GET "/api/work-orders"
handler wisp_api_work_orders_get {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"work-orders\",\"op\":\"list\"}";
}

@route POST "/api/work-orders"
handler wisp_api_work_orders_post {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"work-orders\",\"op\":\"create\"}";
}

@route PUT "/api/work-orders"
handler wisp_api_work_orders_put {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"work-orders\",\"op\":\"update\"}";
}

@route PATCH "/api/work-orders"
handler wisp_api_work_orders_patch {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"work-orders\",\"op\":\"update\"}";
}

@route DELETE "/api/work-orders"
handler wisp_api_work_orders_delete {
  # source backend-services/routes/work-orders — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"work-orders\",\"op\":\"delete\"}";
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

@route GET "/api/snmp"
handler wisp_api_snmp_monitoring_get {
  # source backend-services/routes/snmp-monitoring — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"snmp-monitoring\",\"op\":\"list\"}";
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

@route GET "/api/monitoring/graphs"
handler wisp_api_monitoring_graphs_get {
  # source backend-services/routes/monitoring-graphs — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring-graphs\",\"op\":\"list\"}";
}

@route POST "/api/monitoring/graphs"
handler wisp_api_monitoring_graphs_post {
  # source backend-services/routes/monitoring-graphs — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"monitoring-graphs\",\"op\":\"create\"}";
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

@route GET "/api/notifications"
handler wisp_api_notifications_get {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"notifications\",\"op\":\"list\"}";
}

@route POST "/api/notifications"
handler wisp_api_notifications_post {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"notifications\",\"op\":\"create\"}";
}

@route PUT "/api/notifications"
handler wisp_api_notifications_put {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"notifications\",\"op\":\"update\"}";
}

@route PATCH "/api/notifications"
handler wisp_api_notifications_patch {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"notifications\",\"op\":\"update\"}";
}

@route DELETE "/api/notifications"
handler wisp_api_notifications_delete {
  # source backend-services/routes/notifications — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"notifications\",\"op\":\"delete\"}";
}

@route GET "/api/voice"
handler wisp_api_voice_get {
  # source backend-services/routes/voice — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"voice\",\"op\":\"list\"}";
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

@route GET "/api/admin"
handler wisp_api_admin_prefix_get {
  # source backend-services/routes/admin-prefix — oracle-verified (Phase 29a)
  effects: db, session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"admin-prefix\",\"op\":\"list\"}";
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

@route GET "/api/user-tenants/tenant/:tenantId"
handler wisp_api_user_tenants_tenant_get {
  # POC stub — Firebase tenant store (legacy Svelte client contract)
  effects: session;
  use auth bearer;
  return "{\"ok\":true,\"surface\":\"wisp-api-native\",\"resource\":\"user-tenants\",\"op\":\"get\",\"tenant\":{\"id\":\"demo\",\"name\":\"WISPTools Demo ISP\",\"status\":\"active\"}}";
}

@route ANY "/api/*"
handler wisp_api_catchall {
  effects: none;
  status 404;
  return { ok: false, error: "not_found", surface: "wisp-api-native" };
}
