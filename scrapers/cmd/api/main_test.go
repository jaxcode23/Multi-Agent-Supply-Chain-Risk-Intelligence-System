package main

import (
	"os"
	"testing"
)

func TestParseSeeds_Empty(t *testing.T) {
	seeds := parseSeeds("")
	if len(seeds) != 1 {
		t.Fatalf("expected 1 default seed, got %d", len(seeds))
	}
	if seeds[0].URL != "https://example.com" {
		t.Errorf("expected default URL, got %q", seeds[0].URL)
	}
}

func TestParseSeeds_SingleSeed(t *testing.T) {
	seeds := parseSeeds("https://news.com,h1,p")
	if len(seeds) != 1 {
		t.Fatalf("expected 1 seed, got %d", len(seeds))
	}
	if seeds[0].URL != "https://news.com" {
		t.Errorf("expected URL 'https://news.com', got %q", seeds[0].URL)
	}
	if len(seeds[0].Selectors) != 2 {
		t.Fatalf("expected 2 selectors, got %d", len(seeds[0].Selectors))
	}
	if seeds[0].Selectors[0] != "h1" || seeds[0].Selectors[1] != "p" {
		t.Errorf("unexpected selectors: %v", seeds[0].Selectors)
	}
}

func TestParseSeeds_MultipleSeeds(t *testing.T) {
	seeds := parseSeeds("https://site1.com,div;https://site2.com,span,a")
	if len(seeds) != 2 {
		t.Fatalf("expected 2 seeds, got %d", len(seeds))
	}
	if seeds[0].URL != "https://site1.com" {
		t.Errorf("expected 'https://site1.com', got %q", seeds[0].URL)
	}
	if len(seeds[0].Selectors) != 1 || seeds[0].Selectors[0] != "div" {
		t.Errorf("unexpected selectors for seed 0: %v", seeds[0].Selectors)
	}
	if seeds[1].URL != "https://site2.com" {
		t.Errorf("expected 'https://site2.com', got %q", seeds[1].URL)
	}
	if len(seeds[1].Selectors) != 2 {
		t.Fatalf("expected 2 selectors for seed 1, got %d", len(seeds[1].Selectors))
	}
	if seeds[1].Selectors[0] != "span" || seeds[1].Selectors[1] != "a" {
		t.Errorf("unexpected selectors for seed 1: %v", seeds[1].Selectors)
	}
}

func TestParseSeeds_WhitespaceHandling(t *testing.T) {
	seeds := parseSeeds("  https://site.com ,  h1 , p  ")
	if len(seeds) != 1 {
		t.Fatalf("expected 1 seed, got %d", len(seeds))
	}
	if seeds[0].URL != "https://site.com" {
		t.Errorf("expected 'https://site.com', got %q", seeds[0].URL)
	}
	if seeds[0].Selectors[0] != "h1" || seeds[0].Selectors[1] != "p" {
		t.Errorf("unexpected selectors after trim: %v", seeds[0].Selectors)
	}
}

func TestParseSeeds_InvalidEntrySkipped(t *testing.T) {
	seeds := parseSeeds("https://valid.com,h1;invalid_no_selector")
	if len(seeds) != 1 {
		t.Fatalf("expected 1 valid seed, got %d", len(seeds))
	}
	if seeds[0].URL != "https://valid.com" {
		t.Errorf("expected 'https://valid.com', got %q", seeds[0].URL)
	}
}

func TestParseSeeds_EmptyPartsSkipped(t *testing.T) {
	seeds := parseSeeds("https://site.com,h1;;;https://site2.com,p")
	if len(seeds) != 2 {
		t.Fatalf("expected 2 seeds, got %d", len(seeds))
	}
}

func TestEnvOrDefault_ReturnsDefault(t *testing.T) {
	os.Unsetenv("TEST_VAR")
	got := envOrDefault("TEST_VAR", "fallback")
	if got != "fallback" {
		t.Errorf("expected 'fallback', got %q", got)
	}
}

func TestEnvOrDefault_ReturnsEnvValue(t *testing.T) {
	os.Setenv("TEST_VAR", "custom-value")
	defer os.Unsetenv("TEST_VAR")
	got := envOrDefault("TEST_VAR", "fallback")
	if got != "custom-value" {
		t.Errorf("expected 'custom-value', got %q", got)
	}
}

func TestTrimEach(t *testing.T) {
	input := []string{"  hello ", " world ", "  "}
	got := trimEach(input)
	if len(got) != 3 {
		t.Fatalf("expected 3 elements, got %d", len(got))
	}
	if got[0] != "hello" {
		t.Errorf("expected 'hello', got %q", got[0])
	}
	if got[1] != "world" {
		t.Errorf("expected 'world', got %q", got[1])
	}
}
