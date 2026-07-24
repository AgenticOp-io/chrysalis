package main

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// hub-gold-chi — 20-route Chi dialect (secondary to Gin hub-flagship-go ST).
// r.Get|Post + {id} paths + chi.URLParam + r.URL.Query().Get
// (D6447 — no invented middleware/Mount/chi auth runtime).

func registerRoutes(r chi.Router) {
	r.Get("/health", health)
	r.Get("/ping", ping)
	r.Get("/version", version)
	r.Get("/ready", ready)
	r.Get("/count", count)
	r.Get("/flag", flagHandler)
	r.Get("/build", build)
	r.Get("/tier", tier)
	r.Get("/meta", meta)
	r.Post("/echo", echo)
	r.Get("/items", listItems)
	r.Get("/items/{id}", getItem)
	r.Post("/items", createItem)
	r.Get("/search", search)
	r.Put("/items/{id}", updateItem)
	r.Delete("/items/{id}", deleteItem)
	r.Patch("/items/{id}", patchItem)
	r.Get("/users/{userId}", getUser)
	r.Get("/stats", stats)
	r.Post("/notify", notify)
}

func health(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func ping(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(42)
}

func version(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(1)
}

func ready(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "ok")
}

func count(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(3)
}

func flagHandler(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "chrysalis")
}

func build(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(2026)
}

func tier(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "gold")
}

func meta(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"service": "hub-gold-chi", "version": 1})
}

func echo(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"echo": true})
}

func listItems(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func getItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id})
}

func createItem(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"created": true})
}

func search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	json.NewEncoder(w).Encode(map[string]interface{}{"q": q})
}

func updateItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	json.NewEncoder(w).Encode(map[string]interface{}{"updated": true, "id": id})
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func patchItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	json.NewEncoder(w).Encode(map[string]interface{}{"patched": true, "id": id})
}

func getUser(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	json.NewEncoder(w).Encode(userId)
}

func stats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(3)
}

func notify(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
}
