import Vapor

func hubGoldRoutes(_ app: Application) throws {
    app.get("/ready") { _ in
        return ["ready": true]
    }
    app.post("/echo") { _ in
        return ["ok": true]
    }
}
