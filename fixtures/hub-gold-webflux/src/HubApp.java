package hub;

import static org.springframework.web.reactive.function.server.RequestPredicates.DELETE;
import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RequestPredicates.PATCH;
import static org.springframework.web.reactive.function.server.RequestPredicates.POST;
import static org.springframework.web.reactive.function.server.RequestPredicates.PUT;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

import java.util.Map;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

/**
 * hub-gold-webflux — 20-route Spring WebFlux RouterFunctions dialect
 * (secondary to Spring MVC @RestController hub-flagship-java ST).
 * RouterFunctions.route + RequestPredicates.GET/POST/… + {id} paths + pathVariable / queryParam
 * + ServerResponse.ok|status().bodyValue in ONE file; mirrors hub-flagship-java route set.
 * No WebClient invent (D6447). G10061 / D6523.
 */
public class HubApp {

  public static RouterFunction<ServerResponse> routes() {
    return route(GET("/health"), req -> ServerResponse.ok().bodyValue(true))
        .andRoute(GET("/ping"), req -> ServerResponse.ok().bodyValue(42))
        .andRoute(GET("/version"), req -> ServerResponse.ok().bodyValue(1))
        .andRoute(GET("/ready"), req -> ServerResponse.ok().bodyValue("ok"))
        .andRoute(GET("/count"), req -> ServerResponse.ok().bodyValue(3))
        .andRoute(GET("/flag"), req -> ServerResponse.ok().bodyValue("chrysalis"))
        .andRoute(GET("/build"), req -> ServerResponse.ok().bodyValue(2026))
        .andRoute(GET("/tier"), req -> ServerResponse.ok().bodyValue("gold"))
        .andRoute(
            GET("/meta"),
            req -> ServerResponse.ok().bodyValue(Map.of("service", "hub-gold-webflux", "version", 1)))
        .andRoute(POST("/echo"), req -> ServerResponse.ok().bodyValue(Map.of("echo", true)))
        .andRoute(GET("/items"), req -> ServerResponse.ok().bodyValue(true))
        .andRoute(
            GET("/items/{id}"),
            req -> {
              String id = req.pathVariable("id");
              return ServerResponse.ok().bodyValue(Map.of("id", id));
            })
        .andRoute(
            POST("/items"),
            req -> ServerResponse.status(201).bodyValue(Map.of("created", true)))
        .andRoute(
            GET("/search"),
            req -> {
              String q = req.queryParam("q").orElse("");
              return ServerResponse.ok().bodyValue(Map.of("q", q));
            })
        .andRoute(
            PUT("/items/{id}"),
            req -> {
              String id = req.pathVariable("id");
              return ServerResponse.ok().bodyValue(Map.of("updated", true, "id", id));
            })
        .andRoute(
            DELETE("/items/{id}"),
            req -> {
              req.pathVariable("id");
              return ServerResponse.ok().bodyValue(true);
            })
        .andRoute(
            PATCH("/items/{id}"),
            req -> {
              String id = req.pathVariable("id");
              return ServerResponse.ok().bodyValue(Map.of("patched", true, "id", id));
            })
        .andRoute(
            GET("/users/{userId}"),
            req -> {
              String userId = req.pathVariable("userId");
              return ServerResponse.ok().bodyValue(userId);
            })
        .andRoute(GET("/stats"), req -> ServerResponse.ok().bodyValue(3))
        .andRoute(
            POST("/notify"),
            req -> ServerResponse.status(202).bodyValue(Map.of("ok", true)));
  }
}
