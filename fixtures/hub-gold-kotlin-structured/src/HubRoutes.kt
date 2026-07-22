import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.hubGoldRoutes() {
    routing {
        get("/health") {
            call.respond(mapOf("ok" to true))
        }
        get("/meta") {
            call.respond(mapOf("service" to "hub-gold-kotlin-structured", "version" to 1))
        }
    }
}
