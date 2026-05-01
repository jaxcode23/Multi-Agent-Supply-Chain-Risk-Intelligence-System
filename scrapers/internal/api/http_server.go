package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/jaxcode23/scrapers/internal/service"
)

// Server runs the HTTP health-check and metrics endpoint alongside the gRPC client.
type Server struct {
	addr       string
	grpcClient *service.GRPCClient
	logger     *slog.Logger
	httpServer *http.Server
}

func NewServer(addr string, grpcClient *service.GRPCClient, logger *slog.Logger) *Server {
	s := &Server{addr: addr, grpcClient: grpcClient, logger: logger}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/ready", s.handleReady)

	s.httpServer = &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}
	return s
}

func (s *Server) Start() error {
	s.logger.Info("HTTP server listening", "addr", s.addr)
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context) {
	if err := s.httpServer.Shutdown(ctx); err != nil {
		s.logger.Warn("HTTP server shutdown error", "err", err)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok","service":"go-scraper-gateway"}`))
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if s.grpcClient.IsReady() {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ready","grpc":"connected"}`))
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"not_ready","grpc":"disconnected"}`))
	}
}
