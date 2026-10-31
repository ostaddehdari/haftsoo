package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ostaddehdari/haftsoo/services/chat/internal/server"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--healthcheck" {
		response, err := http.Get("http://127.0.0.1:3002/healthz") // #nosec G107: fixed local health endpoint
		if err != nil || response.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		_ = response.Body.Close()
		return
	}

	address := os.Getenv("CHAT_ADDRESS")
	if address == "" {
		address = ":3002"
	}

	httpServer := &http.Server{
		Addr:              address,
		Handler:           server.NewMux(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("chat service listening", "address", address)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("chat service failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("chat service shutdown failed", "error", err)
	}
}
