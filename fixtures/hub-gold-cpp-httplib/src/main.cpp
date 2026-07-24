#include "httplib.h"
#include <nlohmann/json.hpp>

// hub-gold-cpp-httplib — secondary cpp-httplib dialect (20-route express-depth mirror).
// Does not replace Crow hub-flagship-cpp D6448-ST. Bodies use set_content / status /
// matches / get_param_value + nlohmann::json idioms the hub C++→WebIR lift understands.

void registerRoutes(httplib::Server& svr) {
  svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("true", "text/plain");
  });
  svr.Get("/ping", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("42", "text/plain");
  });
  svr.Get("/version", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("1", "text/plain");
  });
  svr.Get("/ready", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("ok", "text/plain");
  });
  svr.Get("/count", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("3", "text/plain");
  });
  svr.Get("/flag", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("chrysalis", "text/plain");
  });
  svr.Get("/build", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("2026", "text/plain");
  });
  svr.Get("/tier", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("gold", "text/plain");
  });
  svr.Get("/meta", [](const httplib::Request&, httplib::Response& res) {
    nlohmann::json x;
    x["service"] = "hub-gold-cpp-httplib";
    x["version"] = 1;
    res.set_content(x.dump(), "application/json");
  });
  svr.Post("/echo", [](const httplib::Request&, httplib::Response& res) {
    nlohmann::json x;
    x["echo"] = true;
    res.set_content(x.dump(), "application/json");
  });
  svr.Get("/items", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("true", "text/plain");
  });
  svr.Get(R"(/items/([^/]+))", [](const httplib::Request& req, httplib::Response& res) {
    auto id = req.matches[1];
    nlohmann::json x;
    x["id"] = id;
    res.set_content(x.dump(), "application/json");
  });
  svr.Post("/items", [](const httplib::Request&, httplib::Response& res) {
    res.status = 201;
    nlohmann::json x;
    x["created"] = true;
    res.set_content(x.dump(), "application/json");
  });
  svr.Get("/search", [](const httplib::Request& req, httplib::Response& res) {
    auto q = req.get_param_value("q");
    nlohmann::json x;
    x["q"] = q;
    res.set_content(x.dump(), "application/json");
  });
  svr.Put(R"(/items/([^/]+))", [](const httplib::Request& req, httplib::Response& res) {
    auto id = req.matches[1];
    nlohmann::json x;
    x["updated"] = true;
    x["id"] = id;
    res.set_content(x.dump(), "application/json");
  });
  svr.Delete(R"(/items/([^/]+))", [](const httplib::Request& req, httplib::Response& res) {
    auto id = req.matches[1];
    (void)id;
    res.set_content("true", "text/plain");
  });
  svr.Patch(R"(/items/([^/]+))", [](const httplib::Request& req, httplib::Response& res) {
    auto id = req.matches[1];
    nlohmann::json x;
    x["patched"] = true;
    x["id"] = id;
    res.set_content(x.dump(), "application/json");
  });
  svr.Get(R"(/users/([^/]+))", [](const httplib::Request& req, httplib::Response& res) {
    auto userId = req.matches[1];
    res.set_content(userId, "application/json");
  });
  svr.Get("/stats", [](const httplib::Request&, httplib::Response& res) {
    res.set_content("3", "text/plain");
  });
  svr.Post("/notify", [](const httplib::Request&, httplib::Response& res) {
    res.status = 202;
    nlohmann::json x;
    x["ok"] = true;
    res.set_content(x.dump(), "application/json");
  });
}
