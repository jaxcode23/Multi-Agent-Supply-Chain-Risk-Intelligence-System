package service

import (
	"context"
	"log/slog"
	"os"
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

func TestEnvDurationSec_Default(t *testing.T) {
	defer os.Unsetenv("TEST_DURATION")
	os.Unsetenv("TEST_DURATION")

	got := envDurationSec("TEST_DURATION", 30*time.Second)
	if got != 30*time.Second {
		t.Errorf("expected 30s, got %v", got)
	}
}

func TestEnvDurationSec_Custom(t *testing.T) {
	defer os.Unsetenv("TEST_DURATION")
	os.Setenv("TEST_DURATION", "15")

	got := envDurationSec("TEST_DURATION", 30*time.Second)
	if got != 15*time.Second {
		t.Errorf("expected 15s, got %v", got)
	}
}

func TestEnvDurationSec_Invalid(t *testing.T) {
	defer os.Unsetenv("TEST_DURATION")
	os.Setenv("TEST_DURATION", "not-a-number")

	got := envDurationSec("TEST_DURATION", 10*time.Second)
	if got != 10*time.Second {
		t.Errorf("expected 10s fallback, got %v", got)
	}
}

func TestEnvInt_Default(t *testing.T) {
	defer os.Unsetenv("TEST_INT")
	os.Unsetenv("TEST_INT")

	got := envInt("TEST_INT", 42)
	if got != 42 {
		t.Errorf("expected 42, got %d", got)
	}
}

func TestEnvInt_Custom(t *testing.T) {
	defer os.Unsetenv("TEST_INT")
	os.Setenv("TEST_INT", "99")

	got := envInt("TEST_INT", 42)
	if got != 99 {
		t.Errorf("expected 99, got %d", got)
	}
}

func TestEnvInt_Invalid(t *testing.T) {
	defer os.Unsetenv("TEST_INT")
	os.Setenv("TEST_INT", "not-a-number")

	got := envInt("TEST_INT", 7)
	if got != 7 {
		t.Errorf("expected 7 fallback, got %d", got)
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
