package chrysalis

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import hub.hubRoutes
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.testing.*
import java.nio.file.Files
import java.nio.file.Paths
import kotlin.io.path.isRegularFile

fun main(args: Array<String>) {
    val mapper = jacksonObjectMapper()
    if (args.isEmpty()) {
        println(mapper.writeValueAsString(mapOf("ok" to false, "error" to "missing-fixture")))
        return
    }
    val fixture = Paths.get(args[0])
    val routesPath = fixture.resolve("chrysalis.oracle-probe-routes.json")
    if (!Files.isRegularFile(routesPath)) {
        println(mapper.writeValueAsString(mapOf("ok" to false, "error" to "missing-probe-routes")))
        return
    }
    val spec: Map<String, Any> = mapper.readValue(routesPath.toFile())
    @Suppress("UNCHECKED_CAST")
    val routes = spec["routes"] as? List<Map<String, Any>>
    if (routes == null) {
        println(mapper.writeValueAsString(mapOf("ok" to false, "error" to "invalid-probe-routes")))
        return
    }

    val results = mutableListOf<Map<String, Any>>()
    testApplication {
        application { hubRoutes() }
        for (route in routes) {
            val method = (route["method"] as? String ?: "GET").uppercase()
            val path = route["path"] as? String ?: "/"
            val response = client.request(path) {
                this.method = HttpMethod.parse(method)
            }
            val body = response.bodyAsText()
            val headers = linkedMapOf<String, String>()
            response.headers[HttpHeaders.ContentType]?.let { headers["Content-Type"] = it }
            results.add(
                mapOf(
                    "method" to method,
                    "path" to path,
                    "status" to response.status.value,
                    "body" to body,
                    "headers" to headers,
                ),
            )
        }
    }
    println(
        mapper.writeValueAsString(
            mapOf(
                "ok" to true,
                "results" to results,
                "routeCount" to results.size,
            ),
        ),
    )
}
