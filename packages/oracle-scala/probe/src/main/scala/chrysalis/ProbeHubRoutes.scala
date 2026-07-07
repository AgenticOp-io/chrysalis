package chrysalis

import akka.actor.ActorSystem
import akka.http.scaladsl.model._
import akka.http.scaladsl.server._
import akka.http.scaladsl.server.RouteResult.{Complete, Rejected}
import hub.HubRoutes
import spray.json._
import DefaultJsonProtocol._

import java.nio.file.{Files, Paths}
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.io.Source

object ProbeHubRoutes extends App {
  implicit val system: ActorSystem = ActorSystem("chrysalis-scala-probe")
  implicit val ec = system.dispatcher

  def httpMethod(name: String): HttpMethod = name.toUpperCase match {
    case "GET" => HttpMethods.GET
    case "POST" => HttpMethods.POST
    case "PUT" => HttpMethods.PUT
    case "PATCH" => HttpMethods.PATCH
    case "DELETE" => HttpMethods.DELETE
    case "HEAD" => HttpMethods.HEAD
    case other => HttpMethods.custom(other, safe = false)
  }

  try {
    if (args.length < 1) {
      println("""{"ok":false,"error":"missing-fixture"}""")
      sys.exit(1)
    }
    val fixture = Paths.get(args(0))
    val routesPath = fixture.resolve("chrysalis.oracle-probe-routes.json")
    if (!Files.isRegularFile(routesPath)) {
      println("""{"ok":false,"error":"missing-probe-routes"}""")
      sys.exit(1)
    }
    val raw = Source.fromFile(routesPath.toFile).mkString
    val spec = raw.parseJson.asJsObject
    val routes = spec.fields.get("routes") match {
      case Some(JsArray(items)) => items.collect { case o: JsObject => o }
      case _ =>
        println("""{"ok":false,"error":"invalid-probe-routes"}""")
        sys.exit(1)
    }

    val sealedRoute = Route.seal(HubRoutes.routes)
    val results = routes.map { route =>
      val method = route.fields.get("method").collect { case JsString(v) => v }.getOrElse("GET")
      val path = route.fields.get("path").collect { case JsString(v) => v }.getOrElse("/")
      val req = HttpRequest(httpMethod(method), uri = path)
      Await.result(sealedRoute(req), 5.seconds) match {
        case Complete(resp) =>
          val body = Await.result(resp.entity.toStrict(3.seconds).map(_.data.utf8String), 3.seconds)
          val ct = resp.entity.contentType.toString()
          s"""{"method":${JsString(method).compactPrint},"path":${JsString(path).compactPrint},"status":${resp.status.intValue},"body":${JsString(body).compactPrint},"headers":{"Content-Type":${JsString(ct).compactPrint}}}"""
        case Rejected(_) =>
          s"""{"method":${JsString(method).compactPrint},"path":${JsString(path).compactPrint},"error":"rejected"}"""
      }
    }

    println(s"""{"ok":true,"results":[${results.mkString(",")}],"routeCount":${results.length}}""")
  } finally {
    Await.result(system.terminate(), 5.seconds)
  }
}
