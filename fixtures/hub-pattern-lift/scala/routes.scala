import play.api.routing.Router
import play.api.routing.sird._

val routes: Router.Routes = {
  case GET(p"/health") => health
  case POST(p"/items") => createItem
}
