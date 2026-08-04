package hub

import sttp.model.StatusCode
import sttp.tapir._

/**
 * Secondary Scala dialect — Tapir endpoint fluent chain (same 20-route surface as
 * hub-flagship-scala Akka / hub-gold-finch). Bodies use serverLogicSuccess Map/lit
 * the hub Scala→WebIR lift understands — codecs .out(jsonBody|plainBody) are not
 * body authority (**D6447** / G10119 / D6544). No Http4sServerInterpreter invent.
 */
object TapirRoutes {
  val health = endpoint.get.in("health").serverLogicSuccess(_ => true)
  val ping = endpoint.get.in("ping").serverLogicSuccess(_ => 42)
  val version = endpoint.get.in("version").serverLogicSuccess(_ => 1)
  val ready = endpoint.get.in("ready").serverLogicSuccess(_ => "ok")
  val count = endpoint.get.in("count").serverLogicSuccess(_ => 3)
  val flag = endpoint.get.in("flag").serverLogicSuccess(_ => "chrysalis")
  val build = endpoint.get.in("build").serverLogicSuccess(_ => 2026)
  val tier = endpoint.get.in("tier").serverLogicSuccess(_ => "gold")
  val meta =
    endpoint.get.in("meta").serverLogicSuccess(_ => Map("service" -> "hub-gold-tapir", "version" -> 1))
  val echo = endpoint.post.in("echo").serverLogicSuccess(_ => Map("echo" -> true))
  val listItems = endpoint.get.in("items").serverLogicSuccess(_ => true)
  val getItem =
    endpoint.get.in("items").in(path[String]("id")).serverLogicSuccess(id => Map("id" -> id))
  val createItem = endpoint.post
    .in("items")
    .out(statusCode(StatusCode.Created))
    .serverLogicSuccess(_ => Map("created" -> true))
  val search =
    endpoint.get.in("search").in(query[String]("q")).serverLogicSuccess(q => Map("q" -> q))
  val updateItem = endpoint.put
    .in("items")
    .in(path[String]("id"))
    .serverLogicSuccess(id => Map("updated" -> true, "id" -> id))
  val deleteItem =
    endpoint.delete.in("items").in(path[String]("id")).serverLogicSuccess(_ => true)
  val patchItem = endpoint.patch
    .in("items")
    .in(path[String]("id"))
    .serverLogicSuccess(id => Map("patched" -> true, "id" -> id))
  val getUser =
    endpoint.get.in("users").in(path[String]("userId")).serverLogicSuccess(userId => userId)
  val stats = endpoint.get.in("stats").serverLogicSuccess(_ => 3)
  val notify = endpoint.post
    .in("notify")
    .out(statusCode(StatusCode.Accepted))
    .serverLogicSuccess(_ => Map("ok" -> true))
}
