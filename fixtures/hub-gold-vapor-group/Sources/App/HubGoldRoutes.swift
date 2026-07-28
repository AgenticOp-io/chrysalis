import Vapor

/**
 * hub-gold-vapor-group — 20-route Vapor `grouped("prefix")` path-join gold (G10069 / D6531).
 * Same express-depth surface as hub-flagship-swift, registered via literal group prefixes.
 * Fluent / Leaf / auth middleware stay honest holes (D6447 — not present here).
 */
func hubGoldGroupRoutes(_ app: Application) throws {
    let api = app.grouped("api")

    api.get("health") { _ in
        return true
    }
    api.get("ping") { _ in
        return 42
    }
    api.get("version") { _ in
        return 1
    }
    // Chained grouped + verb (literal prefix join).
    app.grouped("api").get("ready") { _ in
        return "ok"
    }
    api.get("count") { _ in
        return 3
    }
    api.get("flag") { _ in
        return "chrysalis"
    }
    api.get("build") { _ in
        return 2026
    }
    api.get("tier") { _ in
        return "gold"
    }
    api.get("meta") { _ in
        return ["service": "hub-gold-vapor-group", "version": 1]
    }
    api.post("echo") { _ in
        return ["echo": true]
    }

    let items = api.grouped("items")
    items.get("") { _ in
        return true
    }
    items.get(":id") { req in
        let id = req.parameters.get("id")!
        return ["id": id]
    }
    items.post("") { req in
        return try await ["created": true].encodeResponse(status: .created, for: req)
    }
    api.get("search") { req in
        let q = req.query["q"] ?? ""
        return ["q": q]
    }
    items.put(":id") { req in
        let id = req.parameters.get("id")!
        return ["updated": true, "id": id]
    }
    items.delete(":id") { _ in
        return true
    }
    items.patch(":id") { req in
        let id = req.parameters.get("id")!
        return ["patched": true, "id": id]
    }
    api.get("users", ":userId") { req in
        let userId = req.parameters.get("userId")!
        return userId
    }
    api.get("stats") { _ in
        return 3
    }
    api.post("notify") { req in
        return try await ["ok": true].encodeResponse(status: .accepted, for: req)
    }
}
