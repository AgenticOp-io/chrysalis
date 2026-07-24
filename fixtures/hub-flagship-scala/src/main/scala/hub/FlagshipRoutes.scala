package hub

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

/**
 * hub-flagship-scala — 20-route Akka HTTP mirror of hub-flagship-express / kotlin / java.
 * No invented product UI (D6447). Bodies use complete / Map / StatusCodes idioms the hub
 * Scala→WebIR lift understands (brace-bounded routes + path/query refs).
 */
object FlagshipRoutes {
  val routes: Route = concat(
    get(path("/health")) { complete(true) },
    get(path("/ping")) { complete(42) },
    get(path("/version")) { complete(1) },
    get(path("/ready")) { complete("ok") },
    get(path("/count")) { complete(3) },
    get(path("/flag")) { complete("chrysalis") },
    get(path("/build")) { complete(2026) },
    get(path("/tier")) { complete("gold") },
    get(path("/meta")) { complete(Map("service" -> "hub-flagship-scala", "version" -> 1)) },
    post(path("/echo")) { complete(Map("echo" -> true)) },
    get(path("/items")) { complete(true) },
    get(path("/items/{id}")) { complete(Map("id" -> id)) },
    post(path("/items")) { complete(StatusCodes.Created, Map("created" -> true)) },
    get(path("/search")) {
      val q = parameter("q").getOrElse("")
      complete(Map("q" -> q))
    },
    put(path("/items/{id}")) { complete(Map("updated" -> true, "id" -> id)) },
    delete(path("/items/{id}")) { complete(true) },
    patch(path("/items/{id}")) { complete(Map("patched" -> true, "id" -> id)) },
    get(path("/users/{userId}")) { complete(userId) },
    get(path("/stats")) { complete(3) },
    post(path("/notify")) { complete(StatusCodes.Accepted, Map("ok" -> true)) },
  )
}
