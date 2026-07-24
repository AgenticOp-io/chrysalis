import Vapor

let app = Application()

app.get("health") { req in
    return "ok"
}

app.post("items") { req in
    return "created"
}

app.get("items", ":id") { req in
    let id = req.parameters.get("id")!
    return id
}
