import Vapor

func hubGoldRoutes(_ app: Application) throws {
    app.get("/health") { _ in
        return ["ok": true]
    }
    app.get("/meta") { _ in
        return ["service": "hub-gold-swift-structured", "version": 1]
    }
}
