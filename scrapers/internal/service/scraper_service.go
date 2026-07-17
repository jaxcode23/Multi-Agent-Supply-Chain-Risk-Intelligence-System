package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/jaxcode23/scrapers/internal/models"
	"github.com/jaxcode23/scrapers/pkg/workerpool"
)

// ScraperEngine defines the interface for the actual scraping implementation (e.g. Colly)
type ScraperEngine interface {
	Scrape(ctx context.Context, url string, selector string) (string, error)
}

// droppedResultCounter is a shared counter sharded across one service instance.
// SectionWorker embeds a pointer so all workers increment the same counter.
var globalDropped atomic.Int64

// DroppedResultCount returns the total number of results dropped by slow consumers.
func DroppedResultCount() int64 {
	return globalDropped.Load()
}

// ResetDroppedResultCount resets the counter (for tests).
func ResetDroppedResultCount() {
	globalDropped.Store(0)
}

// SectionWorker handles "hopping" between DOM sections
type SectionWorker struct {
	Task   models.ScrapeTask
	Engine ScraperEngine
	Output chan<- models.ScrapeResult
}

// Execute performs the scraping work
func (sw *SectionWorker) Execute(ctx context.Context) error {
	// Create a derived context with a timeout for this specific hop
	childCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	result := models.ScrapeResult{
		TaskID:    sw.Task.ID,
		SourceURL: sw.Task.URL,
		FinishedAt: time.Now(),
		Metadata:  sw.Task.Metadata,
	}

	content, err := sw.Engine.Scrape(childCtx, sw.Task.URL, sw.Task.Selector)
	if err != nil {
		result.Status = "FAILED"
		result.Error = fmt.Errorf("failed to scrape section %s: %w", sw.Task.Selector, err)
		sw.sendResult(result)
		return result.Error
	}

	result.Content = content
	result.Status = "SUCCESS"
	sw.sendResult(result)
	return nil
}

func (sw *SectionWorker) sendResult(res models.ScrapeResult) {
	select {
	case sw.Output <- res:
	case <-time.After(1 * time.Second):
		globalDropped.Add(1)
		slog.Warn("dropped result due to slow consumer", "task_id", res.TaskID, "url", res.SourceURL)
	}
}

// ScraperService orchestrates the master and section workers
type ScraperService struct {
	Engine  ScraperEngine
	Results chan models.ScrapeResult
	Pool    *workerpool.Pool
}

func NewScraperService(engine ScraperEngine, pool *workerpool.Pool) *ScraperService {
	return &ScraperService{
		Engine:  engine,
		Results: make(chan models.ScrapeResult, 100),
		Pool:    pool,
	}
}

// StartHopping takes a URL and a list of selectors to scrape concurrently
func (ss *ScraperService) StartHopping(ctx context.Context, url string, selectors []string) {
	for i, sel := range selectors {
		task := models.ScrapeTask{
			ID:        fmt.Sprintf("task-%d-%d", time.Now().Unix(), i),
			URL:       url,
			Selector:  sel,
			CreatedAt: time.Now(),
			Metadata:  map[string]string{"section": sel},
		}

		worker := &SectionWorker{
			Task:   task,
			Engine: ss.Engine,
			Output: ss.Results,
		}

		if err := ss.Pool.Submit(worker); err != nil {
			slog.Error("failed to submit task", "selector", sel, "error", err)
		}
	}
}
