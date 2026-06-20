package controller

import (
	"context"
	"log/slog"
	"time"
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
	logger *slog.Logger
	timeout time.Duration
}

func NewController(logger *slog.Logger) *Controller {
	return &Controller{
		logger:  logger,
		timeout: 30 * time.Second,
	}
}

func (c *Controller) ProcessScrapeRequest(ctx context.Context, req ScrapeRequest) ScrapeResponse {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	c.logger.Info("processing scrape request", "url", req.URL)

	var content = make(map[string]string)
	for _, sel := range req.Selectors {
		content[sel] = ""
	}

	return ScrapeResponse{
		URL:     req.URL,
		Content: content,
	}
}
