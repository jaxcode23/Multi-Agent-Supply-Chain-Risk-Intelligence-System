package service

import (
	"context"
	"log/slog"
	"testing"
	"time"

	pb "github.com/jaxcode23/scrapers/pkg/pb"
)

func TestNewGRPCClient(t *testing.T) {
	client := NewGRPCClient("localhost:9090", slog.Default())
	if client == nil {
		t.Fatal("expected non-nil GRPCClient")
	}
	if client.targetAddr != "localhost:9090" {
		t.Errorf("expected targetAddr 'localhost:9090', got %q", client.targetAddr)
	}
}

func TestGRPCClient_IsReady_ReturnsFalseBeforeConnect(t *testing.T) {
	client := NewGRPCClient("localhost:9090", slog.Default())
	if client.IsReady() {
		t.Fatal("expected IsReady to return false before Connect()")
	}
}

func TestConnect_WithUnreachableAddr(t *testing.T) {
	client := NewGRPCClient("localhost:1", slog.Default())
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := client.Connect(ctx)
	if err == nil {
		t.Fatal("expected error connecting to unreachable address")
	}
}

func TestStartStream_BeforeConnect(t *testing.T) {
	client := NewGRPCClient("localhost:9090", slog.Default())
	ctx := context.Background()
	payloads := make(chan *pb.ScrapePayload)

	err := client.StartStream(ctx, payloads)
	if err == nil {
		t.Fatal("expected error calling StartStream before Connect()")
	}
	if err.Error() != "StartStream called before Connect()" {
		t.Errorf("unexpected error message: %v", err)
	}
}
