package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

type probeRoute struct {
	Method string `json:"method"`
	Path   string `json:"path"`
}

type probeSpec struct {
	Routes []probeRoute `json:"routes"`
}

type probeResult struct {
	Method  string            `json:"method"`
	Path    string            `json:"path"`
	Status  int               `json:"status,omitempty"`
	Body    string            `json:"body,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Error   string            `json:"error,omitempty"`
}

func main() {
	gin.SetMode(gin.TestMode)
	if len(os.Args) < 2 {
		fmt.Println(`{"ok":false,"error":"missing-fixture"}`)
		os.Exit(1)
	}
	fixture := os.Args[1]
	raw, err := os.ReadFile(filepath.Join(fixture, "chrysalis.oracle-probe-routes.json"))
	if err != nil {
		fmt.Println(`{"ok":false,"error":"missing-probe-routes"}`)
		os.Exit(1)
	}
	var spec probeSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		fmt.Println(`{"ok":false,"error":"invalid-probe-routes"}`)
		os.Exit(1)
	}
	r := gin.New()
	registerHubRoutes(r)
	results := make([]probeResult, 0, len(spec.Routes))
	for _, route := range spec.Routes {
		method := strings.ToUpper(route.Method)
		if method == "" {
			method = http.MethodGet
		}
		req := httptest.NewRequest(method, route.Path, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		headers := map[string]string{}
		for k, vals := range w.Header() {
			if len(vals) > 0 {
				headers[k] = vals[0]
			}
		}
		results = append(results, probeResult{
			Method:  method,
			Path:    route.Path,
			Status:  w.Code,
			Body:    w.Body.String(),
			Headers: headers,
		})
	}
	out, _ := json.Marshal(map[string]any{
		"ok":         true,
		"results":    results,
		"routeCount": len(results),
	})
	fmt.Println(string(out))
}
