package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jaxcode23/scrapers/internal/utils"
)

func TestCollyEngine_Scrape_ExtractsHTML(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<html><body><h1>Hello World</h1><p>Some paragraph</p></body></html>`))
	}))
	defer ts.Close()

	ce := NewCollyEngine(utils.NewUserAgentRotator(), utils.NewDomainLimiter())
	content, err := ce.Scrape(context.Background(), ts.URL, "h1")
	if err != nil {
		t.Fatalf("Scrape failed: %v", err)
	}
	if !strings.Contains(content, "Hello World") {
		t.Errorf("expected 'Hello World' in extracted content, got %q", content)
	}
}

func TestCollyEngine_Scrape_MultipleSelectors(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<html><body>
			<h1>Title</h1>
			<p class="desc">Description text</p>
			<span>Span content</span>
		</body></html>`))
	}))
	defer ts.Close()

	ce := NewCollyEngine(utils.NewUserAgentRotator(), utils.NewDomainLimiter())

	tests := []struct {
		selector string
		want     string
	}{
		{"h1", "Title"},
		{"p.desc", "Description text"},
		{"span", "Span content"},
	}
	for _, tt := range tests {
		content, err := ce.Scrape(context.Background(), ts.URL, tt.selector)
		if err != nil {
			t.Fatalf("Scrape(%q) failed: %v", tt.selector, err)
		}
		if !strings.Contains(content, tt.want) {
			t.Errorf("Scrape(%q) = %q, want %q", tt.selector, content, tt.want)
		}
	}
}

func TestCollyEngine_Scrape_RespectsContextCancellation(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<html><body><h1>Slow page</h1></body></html>`))
	}))
	defer ts.Close()

	ce := NewCollyEngine(utils.NewUserAgentRotator(), utils.NewDomainLimiter())
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := ce.Scrape(ctx, ts.URL, "h1")
	if err == nil {
		t.Fatal("expected error from cancelled context, got nil")
	}
}

func TestCollyEngine_Scrape_ReturnsErrorOnBadURL(t *testing.T) {
	ce := NewCollyEngine(utils.NewUserAgentRotator(), utils.NewDomainLimiter())
	_, err := ce.Scrape(context.Background(), "http://127.0.0.1:1", "h1")
	if err == nil {
		t.Fatal("expected error for unreachable URL, got nil")
	}
}

func TestCollyEngine_Scrape_EmptySelectorReturnsNothing(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<html><body><h1>Visible</h1><div style="display:none">Hidden</div></body></html>`))
	}))
	defer ts.Close()

	ce := NewCollyEngine(utils.NewUserAgentRotator(), utils.NewDomainLimiter())
	content, err := ce.Scrape(context.Background(), ts.URL, "nonexistent")
	if err != nil {
		t.Fatalf("Scrape failed: %v", err)
	}
	if content != "" {
		t.Errorf("expected empty content for nonexistent selector, got %q", content)
	}
}
