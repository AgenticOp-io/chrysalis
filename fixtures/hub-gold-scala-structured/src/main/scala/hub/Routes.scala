package hub

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

object Routes {
  val routes: Route = concat(
    get(path("/health")) { complete(Map("ok" -> true)) },
    get(path("/meta")) { complete(Map("service" -> "hub-gold-scala-structured", "version" -> 1)) },
  )
}
