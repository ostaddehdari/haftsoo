package server

import (
	"encoding/json"
	"net/http"
	"time"
)

type healthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
}

func NewMux() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", jsonHandler(http.StatusOK, func() any {
		return healthResponse{Status: "ok", Service: "haftsoo-chat", Version: "0.3.0", Timestamp: time.Now().UTC().Format(time.RFC3339)}
	}))
	mux.HandleFunc("GET /v1/chat/info", jsonHandler(http.StatusOK, func() any {
		return map[string]any{"service": "haftsoo-chat", "transport": []string{"http", "websocket-planned"}}
	}))
	return mux
}

func jsonHandler(status int, payload func() any) http.HandlerFunc {
	return func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json; charset=utf-8")
		writer.WriteHeader(status)
		_ = json.NewEncoder(writer).Encode(payload())
	}
}
