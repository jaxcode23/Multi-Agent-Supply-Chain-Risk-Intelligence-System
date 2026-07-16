package service

import (
	"testing"
)

func TestExtractDomain(t *testing.T) {
	tests := []struct {
		url      string
		expected string
	}{
		{"https://example.com/page", "example.com"},
		{"http://sub.example.com/path/to/resource", "sub.example.com"},
		{"https://example.com", "example.com"},
		{"invalid-url", "unknown"},
		{"", "unknown"},
	}

	ce := &CollyEngine{}
	for _, tt := range tests {
		got := ce.extractDomain(tt.url)
		if got != tt.expected {
			t.Errorf("extractDomain(%q) = %q; want %q", tt.url, got, tt.expected)
		}
	}
}

func TestNewCollyEngine(t *testing.T) {
	// Can be created with nil dependencies (they get initialized later)
	ce := NewCollyEngine(nil, nil, 1.0, 5)
	if ce == nil {
		t.Fatal("expected non-nil CollyEngine")
	}
}
