import Vapor

func hubGoldRoutes(_ app: Application) throws {
    app.get("/health") { _ in
        return true
    }
    app.get("/ping") { _ in
        return 42
    }
}
