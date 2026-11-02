package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
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

	signingKey, err := runtimeSecret("HAFTSOO_SIGNING_KEY", "HAFTSOO_SIGNING_KEY_FILE")
	if err != nil {
		slog.Error("chat signing key is unavailable", "error", err)
		os.Exit(1)
	}
	origins := make(map[string]bool)
	for _, origin := range strings.Split(os.Getenv("HAFTSOO_ALLOWED_ORIGINS"), ",") {
		if value := strings.TrimSpace(origin); value != "" {
			origins[value] = true
		}
	}

	httpServer := &http.Server{
		Addr:              address,
		Handler:           server.NewHandler(server.Config{SigningKey: []byte(signingKey), AllowedOrigins: origins}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       75 * time.Second,
		WriteTimeout:      75 * time.Second,
		IdleTimeout:       90 * time.Second,
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

func runtimeSecret(valueName, fileName string) (string, error) {
	if value := strings.TrimSpace(os.Getenv(valueName)); value != "" {
		if len(value) < 32 {
			return "", errors.New("signing key must contain at least 32 characters")
		}
		return value, nil
	}
	if file := strings.TrimSpace(os.Getenv(fileName)); file != "" {
		content, err := os.ReadFile(file)
		if err != nil {
			return "", err
		}
		value := strings.TrimSpace(string(content))
		if len(value) < 32 {
			return "", errors.New("signing key file must contain at least 32 characters")
		}
		return value, nil
	}
	if os.Getenv("HAFTSOO_ENV") == "development" {
		return "haftsoo-chat-development-signing-key-32-bytes", nil
	}
	return "", errors.New("HAFTSOO_SIGNING_KEY_FILE is required")
}
