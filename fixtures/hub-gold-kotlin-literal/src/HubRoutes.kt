import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.hubGoldRoutes() {
    routing {
        get("/health") {
            call.respond(true)
        }
        get("/ping") {
            call.respond(42)
        }
    }
}
