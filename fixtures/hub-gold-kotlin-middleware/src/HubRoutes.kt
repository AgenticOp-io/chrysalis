import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.hubGoldRoutes() {
    routing {
        get("/ready") {
            call.respond(mapOf("ready" to true))
        }
        post("/echo") {
            call.respond(mapOf("ok" to true))
        }
    }
}
