package hub

import cats.effect.IO
import org.http4s._
import org.http4s.dsl.io._

/**
 * Secondary Scala dialect — Http4s-style routes (same 20-route surface as
 * hub-flagship-scala Akka). No invented product UI (D6447). Bodies use
 * Ok/Created/Accepted + Map/lit the hub Scala→WebIR lift understands.
 */
object Http4sRoutes {
  val routes: HttpRoutes[IO] = HttpRoutes.of[IO] {
    case GET -> Root / "health" => Ok(true)
    case GET -> Root / "ping" => Ok(42)
    case GET -> Root / "version" => Ok(1)
    case GET -> Root / "ready" => Ok("ok")
    case GET -> Root / "count" => Ok(3)
    case GET -> Root / "flag" => Ok("chrysalis")
    case GET -> Root / "build" => Ok(2026)
    case GET -> Root / "tier" => Ok("gold")
    case GET -> Root / "meta" => Ok(Map("service" -> "hub-gold-scala-http4s", "version" -> 1))
    case POST -> Root / "echo" => Ok(Map("echo" -> true))
    case GET -> Root / "items" => Ok(true)
    case GET -> Root / "items" / id => Ok(Map("id" -> id))
    case POST -> Root / "items" => Created(Map("created" -> true))
    case req @ GET -> Root / "search" =>
      val q = req.uri.params.getOrElse("q", "")
      Ok(Map("q" -> q))
    case PUT -> Root / "items" / id => Ok(Map("updated" -> true, "id" -> id))
    case DELETE -> Root / "items" / id => Ok(true)
    case PATCH -> Root / "items" / id => Ok(Map("patched" -> true, "id" -> id))
    case GET -> Root / "users" / userId => Ok(userId)
    case GET -> Root / "stats" => Ok(3)
    case POST -> Root / "notify" => Accepted(Map("ok" -> true))
  }
}
