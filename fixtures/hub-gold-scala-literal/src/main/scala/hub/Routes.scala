package hub

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route

object Routes {
  val routes: Route = concat(
    get(path("/health")) { complete(true) },
    get(path("/ping")) { complete(42) },
  )
}
