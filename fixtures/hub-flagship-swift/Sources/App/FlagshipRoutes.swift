import Vapor

/**
 * hub-flagship-swift — 20-route Vapor mirror of hub-flagship-express / kotlin / java.
 * No invented product UI (D6447). Bodies use dict / encodeResponse / path-query idioms
 * the hub Swift→WebIR lift understands (brace-bounded closures).
 * Path registration uses multi-segment PathComponents (`"items", ":id"`) where idiomatic.
 */
func flagshipRoutes(_ app: Application) throws {
    app.get("health") { _ in
        return true
    }
    app.get("ping") { _ in
        return 42
    }
    app.get("version") { _ in
        return 1
    }
    app.get("ready") { _ in
        return "ok"
    }
    app.get("count") { _ in
        return 3
    }
    app.get("flag") { _ in
        return "chrysalis"
    }
    app.get("build") { _ in
        return 2026
    }
    app.get("tier") { _ in
        return "gold"
    }
    app.get("meta") { _ in
        return ["service": "hub-flagship-swift", "version": 1]
    }
    app.post("echo") { _ in
        return ["echo": true]
    }
    app.get("items") { _ in
        return true
    }
    app.get("items", ":id") { req in
        let id = req.parameters.get("id")!
        return ["id": id]
    }
    app.post("items") { req in
        return try await ["created": true].encodeResponse(status: .created, for: req)
    }
    app.get("search") { req in
        let q = req.query["q"] ?? ""
        return ["q": q]
    }
    app.put("items", ":id") { req in
        let id = req.parameters.get("id")!
        return ["updated": true, "id": id]
    }
    app.delete("items", ":id") { _ in
        return true
    }
    app.patch("items", ":id") { req in
        let id = req.parameters.get("id")!
        return ["patched": true, "id": id]
    }
    app.get("users", ":userId") { req in
        let userId = req.parameters.get("userId")!
        return userId
    }
    app.get("stats") { _ in
        return 3
    }
    app.post("notify") { req in
        return try await ["ok": true].encodeResponse(status: .accepted, for: req)
    }
}
