package main

import (
	"encoding/json"
	"io"
	"net/http"
)

// hub-gold-servemux — 20-route Go 1.22+ net/http ServeMux dialect (secondary to Gin hub-flagship-go ST).
// http.NewServeMux + HandleFunc("METHOD /path") + {id} + PathValue + Query.Get + json.Encode + WriteHeader
// (D6447 — no invented middleware / pattern-conflict runtime). G10030 / D6492.

func newHubMux() *http.ServeMux {
	mux := http.NewServeMux()
	registerRoutes(mux)
	return mux
}

func registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("GET /ping", ping)
	mux.HandleFunc("GET /version", version)
	mux.HandleFunc("GET /ready", ready)
	mux.HandleFunc("GET /count", count)
	mux.HandleFunc("GET /flag", flagHandler)
	mux.HandleFunc("GET /build", build)
	mux.HandleFunc("GET /tier", tier)
	mux.HandleFunc("GET /meta", meta)
	mux.HandleFunc("POST /echo", echo)
	mux.HandleFunc("GET /items", listItems)
	mux.HandleFunc("GET /items/{id}", getItem)
	mux.HandleFunc("POST /items", createItem)
	mux.HandleFunc("GET /search", search)
	mux.HandleFunc("PUT /items/{id}", updateItem)
	mux.HandleFunc("DELETE /items/{id}", deleteItem)
	mux.HandleFunc("PATCH /items/{id}", patchItem)
	mux.HandleFunc("GET /users/{userId}", getUser)
	mux.HandleFunc("GET /stats", stats)
	mux.HandleFunc("POST /notify", notify)
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
	json.NewEncoder(w).Encode(map[string]interface{}{"service": "hub-gold-servemux", "version": 1})
}

func echo(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"echo": true})
}

func listItems(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func getItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
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
	id := r.PathValue("id")
	json.NewEncoder(w).Encode(map[string]interface{}{"updated": true, "id": id})
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func patchItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	json.NewEncoder(w).Encode(map[string]interface{}{"patched": true, "id": id})
}

func getUser(w http.ResponseWriter, r *http.Request) {
	userId := r.PathValue("userId")
	json.NewEncoder(w).Encode(userId)
}

func stats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(3)
}

func notify(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
}
