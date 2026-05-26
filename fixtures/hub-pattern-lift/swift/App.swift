import Vapor

let app = Application()

app.get("health") { req in
    return "ok"
}

app.post("items") { req in
    return "created"
}
