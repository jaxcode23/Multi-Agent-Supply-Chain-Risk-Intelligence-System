package controller

import (
	"context"
	"log/slog"
	"time"

	"github.com/jaxcode23/scrapers/internal/service"
)

type ScrapeRequest struct {
	URL       string
	Selectors []string
}

type ScrapeResponse struct {
	URL     string
	Content map[string]string
	Error   error
}

type Controller struct {
	scraperService *service.ScraperService
	logger         *slog.Logger
	timeout        time.Duration
}

func NewController(scraperService *service.ScraperService, logger *slog.Logger) *Controller {
	return &Controller{
		scraperService: scraperService,
		logger:         logger,
		timeout:        30 * time.Second,
	}
}

func (c *Controller) ProcessScrapeRequest(ctx context.Context, req ScrapeRequest) ScrapeResponse {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	c.logger.Info("processing scrape request", "url", req.URL)

	c.scraperService.StartHopping(ctx, req.URL, req.Selectors)

	var content = make(map[string]string)
	for range req.Selectors {
		select {
		case res := <-c.scraperService.Results:
			if res.Error != nil {
				c.logger.Warn("scrape failed", "section", res.Metadata["section"], "err", res.Error)
				content[res.Metadata["section"]] = ""
			} else {
				content[res.Metadata["section"]] = res.Content
			}
		case <-ctx.Done():
			c.logger.Warn("context cancelled while collecting results")
			return ScrapeResponse{URL: req.URL, Content: content}
		}
	}

	return ScrapeResponse{URL: req.URL, Content: content}
}
