package main

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gorilla/mux"
)

// hub-gold-gorilla — 20-route Gorilla mux dialect (secondary to Gin hub-flagship-go ST).
// mux.NewRouter HandleFunc+Methods + {id} paths + mux.Vars + json.NewEncoder + WriteHeader
// (D6447 — no invented middleware/Subrouter/auth runtime). G10018 / D6480.

func registerRoutes(r *mux.Router) {
	r.HandleFunc("/health", health).Methods("GET")
	r.HandleFunc("/ping", ping).Methods("GET")
	r.HandleFunc("/version", version).Methods("GET")
	r.HandleFunc("/ready", ready).Methods("GET")
	r.HandleFunc("/count", count).Methods("GET")
	r.HandleFunc("/flag", flagHandler).Methods("GET")
	r.HandleFunc("/build", build).Methods("GET")
	r.HandleFunc("/tier", tier).Methods("GET")
	r.HandleFunc("/meta", meta).Methods("GET")
	r.HandleFunc("/echo", echo).Methods("POST")
	r.HandleFunc("/items", listItems).Methods("GET")
	r.HandleFunc("/items/{id}", getItem).Methods("GET")
	r.HandleFunc("/items", createItem).Methods("POST")
	r.HandleFunc("/search", search).Methods("GET")
	r.HandleFunc("/items/{id}", updateItem).Methods("PUT")
	r.HandleFunc("/items/{id}", deleteItem).Methods("DELETE")
	r.HandleFunc("/items/{id}", patchItem).Methods("PATCH")
	r.HandleFunc("/users/{userId}", getUser).Methods("GET")
	r.HandleFunc("/stats", stats).Methods("GET")
	r.HandleFunc("/notify", notify).Methods("POST")
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
	json.NewEncoder(w).Encode(map[string]interface{}{"service": "hub-gold-gorilla", "version": 1})
}

func echo(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{"echo": true})
}

func listItems(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func getItem(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
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
	id := mux.Vars(r)["id"]
	json.NewEncoder(w).Encode(map[string]interface{}{"updated": true, "id": id})
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(true)
}

func patchItem(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	json.NewEncoder(w).Encode(map[string]interface{}{"patched": true, "id": id})
}

func getUser(w http.ResponseWriter, r *http.Request) {
	userId := mux.Vars(r)["userId"]
	json.NewEncoder(w).Encode(userId)
}

func stats(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(3)
}

func notify(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
}
