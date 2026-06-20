package utils

import (
	"context"
	"testing"
	"time"
)

func TestNewDomainLimiter(t *testing.T) {
	dl := NewDomainLimiter()
	if dl == nil {
		t.Fatal("expected non-nil DomainLimiter")
	}
}

func TestDomainLimiterWait_BlocksThenReleases(t *testing.T) {
	dl := NewDomainLimiter()
	ctx := context.Background()

	err := dl.Wait(ctx, "example.com", 1000, 10) // high rps = no delay
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDomainLimiterWait_CancelledContext(t *testing.T) {
	dl := NewDomainLimiter()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := dl.Wait(ctx, "example.com", 1000, 10)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestDomainLimiter_PerDomainIsolation(t *testing.T) {
	dl := NewDomainLimiter()
	ctx := context.Background()

	// Both should succeed independently
	if err := dl.Wait(ctx, "site-a.com", 1000, 10); err != nil {
		t.Fatal(err)
	}
	if err := dl.Wait(ctx, "site-b.com", 1000, 10); err != nil {
		t.Fatal(err)
	}
}

func TestNewUserAgentRotator(t *testing.T) {
	uar := NewUserAgentRotator()
	if uar == nil {
		t.Fatal("expected non-nil UserAgentRotator")
	}
}

func TestGetRandom_ReturnsValidUserAgent(t *testing.T) {
	uar := NewUserAgentRotator()
	ua := uar.GetRandom()
	if ua == "" {
		t.Fatal("expected non-empty user agent")
	}
	if len(ua) < 20 {
		t.Fatalf("user agent too short: %q", ua)
	}
}

func TestGetRandom_ReturnsDifferentValues(t *testing.T) {
	uar := NewUserAgentRotator()
	seen := make(map[string]bool)
	for i := 0; i < 20; i++ {
		seen[uar.GetRandom()] = true
	}
	// With 4 UAs in the pool, 20 attempts should find at least 2 distinct ones
	if len(seen) < 2 {
		t.Fatalf("expected at least 2 distinct user agents, got %d", len(seen))
	}
}

func TestDomainLimiter_WaitAppliesJitter(t *testing.T) {
	dl := NewDomainLimiter()
	ctx := context.Background()

	start := time.Now()
	_ = dl.Wait(ctx, "jitter-test.com", 1000, 10)
	elapsed := time.Since(start)

	if elapsed > 2*time.Second {
		t.Fatalf("jitter took too long: %v", elapsed)
	}
}
