package api

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jaxcode23/scrapers/internal/service"
)

func TestHealthEndpoint(t *testing.T) {
	server := NewServer(":0", nil, slog.Default())
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	server.handleHealth(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	expected := `{"status":"ok","service":"go-scraper-gateway"}`
	if strings.TrimSpace(w.Body.String()) != expected {
		t.Errorf("expected body %q, got %q", expected, w.Body.String())
	}
}

func TestReadyEndpoint_WhenNotConnected(t *testing.T) {
	client := service.NewGRPCClient("localhost:1", slog.Default())
	server := NewServer(":0", client, slog.Default())

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	w := httptest.NewRecorder()

	server.handleReady(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
	expected := `{"status":"not_ready","grpc":"disconnected"}`
	if strings.TrimSpace(w.Body.String()) != expected {
		t.Errorf("expected body %q, got %q", expected, w.Body.String())
	}
}

func TestNewServer_SetsTimeouts(t *testing.T) {
	server := NewServer(":8080", nil, slog.Default())
	if server.httpServer.ReadTimeout != 5*time.Second {
		t.Errorf("expected ReadTimeout 5s, got %v", server.httpServer.ReadTimeout)
	}
	if server.httpServer.WriteTimeout != 5*time.Second {
		t.Errorf("expected WriteTimeout 5s, got %v", server.httpServer.WriteTimeout)
	}
}

func TestNewServer_RegistersRoutes(t *testing.T) {
	server := NewServer(":8080", nil, slog.Default())
	h := server.httpServer.Handler
	if h == nil {
		t.Fatal("expected non-nil handler")
	}
}
