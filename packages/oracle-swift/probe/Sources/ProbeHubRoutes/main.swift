import Foundation
import Vapor
import XCTVapor
import HubRoutes

@main
enum ProbeHubRoutes {
    static func main() throws {
        guard CommandLine.arguments.count > 1 else {
            print("{\"ok\":false,\"error\":\"missing-fixture\"}")
            return
        }
        let fixture = URL(fileURLWithPath: CommandLine.arguments[1])
        let routesPath = fixture.appendingPathComponent("chrysalis.oracle-probe-routes.json")
        guard let data = try? Data(contentsOf: routesPath),
              let spec = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let routes = spec["routes"] as? [[String: Any]]
        else {
            print("{\"ok\":false,\"error\":\"missing-probe-routes\"}")
            return
        }

        let app = Application(.testing)
        defer { app.shutdown() }
        try hubRoutes(app.routes)

        var results: [[String: Any]] = []
        for route in routes {
            let methodName = (route["method"] as? String ?? "GET").uppercased()
            let path = route["path"] as? String ?? "/"
            let method = HTTPMethod(rawValue: methodName)
            var captured: [String: Any] = [:]
            try app.test(method, path) { res in
                var headers: [String: String] = [:]
                if let ct = res.headers.contentType?.description {
                    headers["Content-Type"] = ct
                }
                captured = [
                    "method": methodName,
                    "path": path,
                    "status": Int(res.status.code),
                    "body": res.body.string,
                    "headers": headers,
                ]
            }
            results.append(captured)
        }

        let out: [String: Any] = [
            "ok": true,
            "results": results,
            "routeCount": results.count,
        ]
        let json = try JSONSerialization.data(withJSONObject: out, options: [])
        if let line = String(data: json, encoding: .utf8) {
            print(line)
        }
    }
}
