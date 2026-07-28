package hub

import io.finch._

/**
 * Secondary Scala dialect — Finch-style endpoints (same 20-route surface as
 * hub-flagship-scala Akka). No invented product UI (D6447). Bodies use
 * Ok/Created/Accepted + Map/lit the hub Scala→WebIR lift understands.
 * Flat peelable shapes only: string path matchers, path[T] segments,
 * param[T] query binders (G10051 / D6513).
 */
object FinchRoutes {
  val health = get("health") { Ok(true) }
  val ping = get("ping") { Ok(42) }
  val version = get("version") { Ok(1) }
  val ready = get("ready") { Ok("ok") }
  val count = get("count") { Ok(3) }
  val flag = get("flag") { Ok("chrysalis") }
  val build = get("build") { Ok(2026) }
  val tier = get("tier") { Ok("gold") }
  val meta = get("meta") { Ok(Map("service" -> "hub-gold-finch", "version" -> 1)) }
  val echo = post("echo") { Ok(Map("echo" -> true)) }
  val listItems = get("items") { Ok(true) }
  val getItem = get("items" :: path[String]) { id => Ok(Map("id" -> id)) }
  val createItem = post("items") { Created(Map("created" -> true)) }
  val search = get("search" :: param[String]("q")) { q => Ok(Map("q" -> q)) }
  val updateItem = put("items" :: path[String]) { id => Ok(Map("updated" -> true, "id" -> id)) }
  val deleteItem = delete("items" :: path[String]) { id => Ok(true) }
  val patchItem = patch("items" :: path[String]) { id => Ok(Map("patched" -> true, "id" -> id)) }
  val getUser = get("users" :: path[String]) { userId => Ok(userId) }
  val stats = get("stats") { Ok(3) }
  val notify = post("notify") { Accepted(Map("ok" -> true)) }
}
