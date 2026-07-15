package service

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/jaxcode23/scrapers/internal/utils"
)

// CollyEngine implements the ScraperEngine interface using Colly
type CollyEngine struct {
	UARotator     *utils.UserAgentRotator
	Limiter       *utils.DomainLimiter
	requestsPerSec float64
	burstSize     int
}

func NewCollyEngine(ua *utils.UserAgentRotator, lim *utils.DomainLimiter, rps float64, burst int) *CollyEngine {
	if rps <= 0 {
		rps = 1.0
	}
	if burst <= 0 {
		burst = 5
	}
	return &CollyEngine{
		UARotator:     ua,
		Limiter:       lim,
		requestsPerSec: rps,
		burstSize:     burst,
	}
}

// Scrape performs the actual network request and extraction
func (ce *CollyEngine) Scrape(ctx context.Context, url string, selector string) (string, error) {
	// 1. Wait for rate limiter
	domain := ce.extractDomain(url)
	if err := ce.Limiter.Wait(ctx, domain, ce.requestsPerSec, ce.burstSize); err != nil {
		return "", fmt.Errorf("rate limit wait failed: %w", err)
	}

	// 2. Derive a deadline from ctx for the HTTP client
	deadline, hasDeadline := ctx.Deadline()
	httpTimeout := 30 * time.Second
	if hasDeadline {
		timeout := time.Until(deadline)
		if timeout > 0 {
			httpTimeout = timeout
		}
	}

	// 3. Initialize Collector with a context-aware HTTP timeout
	c := colly.NewCollector(
		colly.UserAgent(ce.UARotator.GetRandom()),
		colly.AllowURLRevisit(),
	)
	c.SetClient(&http.Client{
		Timeout: httpTimeout,
		Transport: &http.Transport{
			MaxIdleConns:    10,
			IdleConnTimeout: 30 * time.Second,
		},
	})

	// Abort early if the parent context is already cancelled
	if ctx.Err() != nil {
		return "", ctx.Err()
	}

	var extractedText strings.Builder

	// Stop the collector when the parent context is cancelled
	c.OnRequest(func(r *colly.Request) {
		select {
		case <-ctx.Done():
			r.Abort()
		default:
		}
	})

	// 5. Define extraction logic
	c.OnHTML(selector, func(e *colly.HTMLElement) {
		text := strings.TrimSpace(e.Text)
		if text != "" {
			extractedText.WriteString(text)
			extractedText.WriteString("\n")
		}
	})

	// 6. Handle errors
	var scrapeErr error
	c.OnError(func(r *colly.Response, err error) {
		scrapeErr = fmt.Errorf("request failed with status %d: %w", r.StatusCode, err)
	})

	// 7. Execute Scrape
	if err := c.Visit(url); err != nil {
		return "", fmt.Errorf("visit failed: %w", err)
	}

	if scrapeErr != nil {
		return "", scrapeErr
	}

	return extractedText.String(), nil
}

func (ce *CollyEngine) extractDomain(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" {
		return "unknown"
	}
	return parsed.Host
}
