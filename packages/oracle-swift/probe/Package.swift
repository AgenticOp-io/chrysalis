// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "chrysalis-hub-swift-probe",
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.99.0"),
    ],
    targets: [
        .target(
            name: "HubRoutes",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ],
            path: "Sources/HubRoutes"
        ),
        .executableTarget(
            name: "ProbeHubRoutes",
            dependencies: [
                "HubRoutes",
                .product(name: "Vapor", package: "vapor"),
                .product(name: "XCTVapor", package: "vapor"),
            ],
            path: "Sources/ProbeHubRoutes"
        ),
    ]
)
