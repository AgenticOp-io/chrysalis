package hub

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

object Routes {
  val routes: Route = concat(
    get(path("/ready")) { complete(Map("ready" -> true)) },
    post(path("/echo")) { complete(Map("ok" -> true)) },
  )
}
