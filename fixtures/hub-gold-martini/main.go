package main

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-martini/martini"
	"github.com/martini-contrib/render"
)

// hub-gold-martini — 20-route Martini dialect (secondary to Gin hub-flagship-go ST).
// martini.Classic + m.Get|Post + :id paths + params["id"] +
// render.JSON / json.NewEncoder(w) / io.WriteString
// (D6447 — no invented middleware/Group/bind runtime). G10056 / D6518.

func newApp() *martini.ClassicMartini {
	m := martini.Classic()
	m.Use(render.Renderer())
	registerRoutes(m)
	return m
}

func registerRoutes(m martini.Router) {
	m.Get("/health", health)
	m.Get("/ping", ping)
	m.Get("/version", version)
	m.Get("/ready", ready)
	m.Get("/count", count)
	m.Get("/flag", flagHandler)
	m.Get("/build", build)
	m.Get("/tier", tier)
	m.Get("/meta", meta)
	m.Post("/echo", echoRoute)
	m.Get("/items", listItems)
	m.Get("/items/:id", getItem)
	m.Post("/items", createItem)
	m.Get("/search", search)
	m.Put("/items/:id", updateItem)
	m.Delete("/items/:id", deleteItem)
	m.Patch("/items/:id", patchItem)
	m.Get("/users/:userId", getUser)
	m.Get("/stats", stats)
	m.Post("/notify", notify)
}

func health(r render.Render) {
	r.JSON(200, true)
}

func ping(r render.Render) {
	r.JSON(200, 42)
}

func version(r render.Render) {
	r.JSON(200, 1)
}

func ready() string {
	return "ok"
}

func count(r render.Render) {
	r.JSON(200, 3)
}

func flagHandler() string {
	return "chrysalis"
}

func build(r render.Render) {
	r.JSON(200, 2026)
}

func tier(w http.ResponseWriter) {
	io.WriteString(w, "gold")
}

func meta(r render.Render) {
	r.JSON(200, map[string]interface{}{"service": "hub-gold-martini", "version": 1})
}

func echoRoute(r render.Render) {
	r.JSON(200, map[string]interface{}{"echo": true})
}

func listItems(w http.ResponseWriter) {
	json.NewEncoder(w).Encode(true)
}

func getItem(params martini.Params, r render.Render) {
	id := params["id"]
	r.JSON(200, map[string]interface{}{"id": id})
}

func createItem(r render.Render) {
	r.JSON(201, map[string]interface{}{"created": true})
}

func search(req *http.Request, r render.Render) {
	q := req.URL.Query().Get("q")
	r.JSON(200, map[string]interface{}{"q": q})
}

func updateItem(params martini.Params, r render.Render) {
	id := params["id"]
	r.JSON(200, map[string]interface{}{"updated": true, "id": id})
}

func deleteItem(r render.Render) {
	r.JSON(200, true)
}

func patchItem(params martini.Params, r render.Render) {
	id := params["id"]
	r.JSON(200, map[string]interface{}{"patched": true, "id": id})
}

func getUser(params martini.Params, r render.Render) {
	userId := params["userId"]
	r.JSON(200, userId)
}

func stats(w http.ResponseWriter) {
	json.NewEncoder(w).Encode(3)
}

func notify(r render.Render) {
	r.JSON(202, map[string]interface{}{"ok": true})
}
