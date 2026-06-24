import akka.http.scaladsl.server.Directives._

val routes =
  get(path("health")) { complete(true) } ~
  post(path("items")) { complete(Map("id" -> 1)) }
