#include <drogon/drogon.h>
#include <functional>
#include <string>

// hub-gold-drogon — secondary Drogon C++ dialect (20-route express-depth mirror).
// Peels app().registerHandler + Json::Value / newHttpJsonResponse / setBody /
// setStatusCode(k*) / getParameter / {id} lambda args (G10117 / D6542).
// Does not replace Crow hub-flagship-cpp D6448-ST. No METHOD_ADD / filters invent (**D6447**).

using namespace drogon;

void registerRoutes() {
  app().registerHandler(
      "/health",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("true");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/ping",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("42");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/version",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("1");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/ready",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("ok");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/count",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("3");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/flag",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("chrysalis");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/build",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("2026");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/tier",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("gold");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/meta",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        Json::Value x;
        x["service"] = "hub-gold-drogon";
        x["version"] = 1;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Get});
  app().registerHandler(
      "/echo",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        Json::Value x;
        x["echo"] = true;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Post});
  app().registerHandler(
      "/items",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("true");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/items/{id}",
      [](const HttpRequestPtr &,
         std::function<void(const HttpResponsePtr &)> &&callback,
         const std::string &id) {
        Json::Value x;
        x["id"] = id;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Get});
  app().registerHandler(
      "/items",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        Json::Value x;
        x["created"] = true;
        auto resp = HttpResponse::newHttpJsonResponse(x);
        resp->setStatusCode(k201Created);
        callback(resp);
      },
      {Post});
  app().registerHandler(
      "/search",
      [](const HttpRequestPtr &req,
         std::function<void(const HttpResponsePtr &)> &&callback) {
        auto q = req->getParameter("q");
        Json::Value x;
        x["q"] = q;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Get});
  app().registerHandler(
      "/items/{id}",
      [](const HttpRequestPtr &,
         std::function<void(const HttpResponsePtr &)> &&callback,
         const std::string &id) {
        Json::Value x;
        x["updated"] = true;
        x["id"] = id;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Put});
  app().registerHandler(
      "/items/{id}",
      [](const HttpRequestPtr &,
         std::function<void(const HttpResponsePtr &)> &&callback,
         const std::string &id) {
        (void)id;
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("true");
        callback(resp);
      },
      {Delete});
  app().registerHandler(
      "/items/{id}",
      [](const HttpRequestPtr &,
         std::function<void(const HttpResponsePtr &)> &&callback,
         const std::string &id) {
        Json::Value x;
        x["patched"] = true;
        x["id"] = id;
        callback(HttpResponse::newHttpJsonResponse(x));
      },
      {Patch});
  app().registerHandler(
      "/users/{userId}",
      [](const HttpRequestPtr &,
         std::function<void(const HttpResponsePtr &)> &&callback,
         const std::string &userId) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody(userId);
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/stats",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setBody("3");
        callback(resp);
      },
      {Get});
  app().registerHandler(
      "/notify",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        Json::Value x;
        x["ok"] = true;
        auto resp = HttpResponse::newHttpJsonResponse(x);
        resp->setStatusCode(k202Accepted);
        callback(resp);
      },
      {Post});
}
