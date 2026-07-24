#include "crow.h"

// hub-flagship-cpp — 20-route Crow mirror of hub-flagship-express / go / rust.
// No invented product UI (D6447). Bodies use Crow json::wvalue / response(status, …)
// idioms the hub C++→WebIR lift understands (brace-bounded handlers + path/query refs).

void registerRoutes(crow::SimpleApp& app) {
  CROW_ROUTE(app, "/health")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(true);
    });

  CROW_ROUTE(app, "/ping")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(42);
    });

  CROW_ROUTE(app, "/version")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(1);
    });

  CROW_ROUTE(app, "/ready")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::response(200, "ok");
    });

  CROW_ROUTE(app, "/count")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(3);
    });

  CROW_ROUTE(app, "/flag")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::response(200, "chrysalis");
    });

  CROW_ROUTE(app, "/build")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(2026);
    });

  CROW_ROUTE(app, "/tier")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::response(200, "gold");
    });

  CROW_ROUTE(app, "/meta")
    .methods(crow::HTTPMethod::Get)([]() {
      crow::json::wvalue x;
      x["service"] = "hub-flagship-cpp";
      x["version"] = 1;
      return x;
    });

  CROW_ROUTE(app, "/echo")
    .methods(crow::HTTPMethod::Post)([]() {
      crow::json::wvalue x;
      x["echo"] = true;
      return x;
    });

  CROW_ROUTE(app, "/items")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(true);
    });

  CROW_ROUTE(app, "/items/<string>")
    .methods(crow::HTTPMethod::Get)([](std::string id) {
      crow::json::wvalue x;
      x["id"] = id;
      return x;
    });

  CROW_ROUTE(app, "/items")
    .methods(crow::HTTPMethod::Post)([]() {
      crow::json::wvalue x;
      x["created"] = true;
      return crow::response(201, x);
    });

  CROW_ROUTE(app, "/search")
    .methods(crow::HTTPMethod::Get)([](const crow::request& req) {
      auto q = req.url_params.get("q");
      crow::json::wvalue x;
      x["q"] = q;
      return x;
    });

  CROW_ROUTE(app, "/items/<string>")
    .methods(crow::HTTPMethod::Put)([](std::string id) {
      crow::json::wvalue x;
      x["updated"] = true;
      x["id"] = id;
      return x;
    });

  CROW_ROUTE(app, "/items/<string>")
    .methods(crow::HTTPMethod::Delete)([](std::string id) {
      (void)id;
      return crow::json::wvalue(true);
    });

  CROW_ROUTE(app, "/items/<string>")
    .methods(crow::HTTPMethod::Patch)([](std::string id) {
      crow::json::wvalue x;
      x["patched"] = true;
      x["id"] = id;
      return x;
    });

  CROW_ROUTE(app, "/users/<string>")
    .methods(crow::HTTPMethod::Get)([](std::string userId) {
      return crow::json::wvalue(userId);
    });

  CROW_ROUTE(app, "/stats")
    .methods(crow::HTTPMethod::Get)([]() {
      return crow::json::wvalue(3);
    });

  CROW_ROUTE(app, "/notify")
    .methods(crow::HTTPMethod::Post)([]() {
      crow::json::wvalue x;
      x["ok"] = true;
      return crow::response(202, x);
    });
}
