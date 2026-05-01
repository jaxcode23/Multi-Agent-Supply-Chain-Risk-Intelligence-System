package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/gocolly/colly/v2"
	"github.com/jaxcode23/scrapers/internal/utils"
)

// CollyEngine implements the ScraperEngine interface using Colly
type CollyEngine struct {
	UARotator *utils.UserAgentRotator
	Limiter   *utils.DomainLimiter
}

func NewCollyEngine(ua *utils.UserAgentRotator, lim *utils.DomainLimiter) *CollyEngine {
	return &CollyEngine{
		UARotator: ua,
		Limiter:   lim,
	}
}

// Scrape performs the actual network request and extraction
func (ce *CollyEngine) Scrape(ctx context.Context, url string, selector string) (string, error) {
	// 1. Wait for rate limiter
	domain := ce.extractDomain(url)
	if err := ce.Limiter.Wait(ctx, domain, 1.0, 5); err != nil {
		return "", fmt.Errorf("rate limit wait failed: %w", err)
	}

	// 2. Initialize Collector
	c := colly.NewCollector(
		colly.UserAgent(ce.UARotator.GetRandom()),
		colly.AllowURLRevisit(),
	)

	var extractedText strings.Builder

	// 3. Define extraction logic
	c.OnHTML(selector, func(e *colly.HTMLElement) {
		text := strings.TrimSpace(e.Text)
		if text != "" {
			extractedText.WriteString(text)
			extractedText.WriteString("\n")
		}
	})

	// 4. Handle errors
	var scrapeErr error
	c.OnError(func(r *colly.Response, err error) {
		scrapeErr = fmt.Errorf("request failed with status %d: %w", r.StatusCode, err)
	})

	// 5. Execute Scrape
	if err := c.Visit(url); err != nil {
		return "", fmt.Errorf("visit failed: %w", err)
	}

	if scrapeErr != nil {
		return "", scrapeErr
	}

	return extractedText.String(), nil
}

func (ce *CollyEngine) extractDomain(url string) string {
	// Simple domain extractor logic
	parts := strings.Split(url, "/")
	if len(parts) > 2 {
		return parts[2]
	}
	return "unknown"
}
