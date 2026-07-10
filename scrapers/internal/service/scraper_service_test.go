package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jaxcode23/scrapers/internal/models"
	"github.com/jaxcode23/scrapers/pkg/workerpool"
)

// mockEngine implements ScraperEngine for testing
type mockEngine struct {
	content string
	err     error
}

func (m *mockEngine) Scrape(ctx context.Context, url string, selector string) (string, error) {
	return m.content, m.err
}

func TestSectionWorker_Execute_Success(t *testing.T) {
	results := make(chan models.ScrapeResult, 1)
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:       "task-1",
			URL:      "https://example.com",
			Selector: "h1",
		},
		Engine: &mockEngine{content: "Hello World"},
		Output: results,
	}

	err := worker.Execute(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	select {
	case res := <-results:
		if res.Status != "SUCCESS" {
			t.Errorf("expected SUCCESS, got %q", res.Status)
		}
		if res.Content != "Hello World" {
			t.Errorf("expected content 'Hello World', got %q", res.Content)
		}
		if res.TaskID != "task-1" {
			t.Errorf("expected TaskID task-1, got %q", res.TaskID)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for result")
	}
}

func TestSectionWorker_Execute_Error(t *testing.T) {
	results := make(chan models.ScrapeResult, 1)
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:       "task-2",
			URL:      "https://example.com",
			Selector: "h1",
		},
		Engine: &mockEngine{err: errors.New("connection refused")},
		Output: results,
	}

	err := worker.Execute(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "connection refused") {
		t.Errorf("expected 'connection refused' in error, got %v", err)
	}

	select {
	case res := <-results:
		if res.Status != "FAILED" {
			t.Errorf("expected FAILED, got %q", res.Status)
		}
		if res.Error == nil {
			t.Fatal("expected non-nil Error in result")
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for result")
	}
}

func TestSectionWorker_Execute_WithTimeout(t *testing.T) {
	results := make(chan models.ScrapeResult, 1)
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:       "task-3",
			URL:      "https://example.com",
			Selector: "h1",
		},
		Engine: &mockEngine{content: "data"},
		Output: results,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := worker.Execute(ctx)
	if err != nil {
		t.Fatalf("expected success even with short timeout, got: %v", err)
	}
}

func TestSectionWorker_ResultChannelBlock(t *testing.T) {
	// Unbuffered channel — sendResult should not block indefinitely
	results := make(chan models.ScrapeResult)
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:       "task-block",
			URL:      "https://example.com",
			Selector: "h1",
		},
		Engine: &mockEngine{content: "data"},
		Output: results,
	}

	// No consumer reading from results — Execute should not hang
	done := make(chan struct{})
	go func() {
		worker.Execute(context.Background())
		close(done)
	}()

	select {
	case <-done:
		// OK — did not block
	case <-time.After(3 * time.Second):
		t.Fatal("Execute blocked on full result channel")
	}
}

func TestNewScraperService(t *testing.T) {
	ctx := context.Background()
	pool := workerpool.NewPool(ctx, 2)
	pool.Start()
	defer pool.Stop()

	svc := NewScraperService(&mockEngine{content: "test"}, pool)
	if svc == nil {
		t.Fatal("expected non-nil ScraperService")
	}
	if svc.Results == nil {
		t.Fatal("expected non-nil Results channel")
	}
}

func TestStartHopping_SubmitsAllSelectors(t *testing.T) {
	ctx := context.Background()
	pool := workerpool.NewPool(ctx, 5)
	pool.Start()
	defer pool.Stop()

	svc := NewScraperService(&mockEngine{content: "data"}, pool)

	svc.StartHopping(ctx, "https://example.com", []string{"h1", "p", "a"})

	// Allow workers to process
	time.Sleep(200 * time.Millisecond)

	// We should have received 3 results
	count := 0
	for {
		select {
		case <-svc.Results:
			count++
			if count >= 3 {
				goto done
			}
		case <-time.After(time.Second):
			t.Fatalf("expected 3 results, got %d", count)
		}
	}
done:
	if count != 3 {
		t.Errorf("expected 3 results, got %d", count)
	}
}

func TestDroppedResultCounter_IncrementsOnBlock(t *testing.T) {
	ResetDroppedResultCount()
	results := make(chan models.ScrapeResult) // unbuffered, no consumer
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:  "task-drop",
			URL: "https://example.com",
		},
		Engine: &mockEngine{content: "data"},
		Output: results,
	}
	before := DroppedResultCount()
	worker.sendResult(models.ScrapeResult{TaskID: "task-drop"})
	after := DroppedResultCount()
	if after-before != 1 {
		t.Errorf("expected dropped counter to increment by 1, got %d", after-before)
	}
}

func TestDroppedResultCounter_DoesNotIncrementOnSuccess(t *testing.T) {
	ResetDroppedResultCount()
	results := make(chan models.ScrapeResult, 1)
	worker := &SectionWorker{
		Task: models.ScrapeTask{
			ID:  "task-ok",
			URL: "https://example.com",
		},
		Engine: &mockEngine{content: "data"},
		Output: results,
	}
	before := DroppedResultCount()
	worker.sendResult(models.ScrapeResult{TaskID: "task-ok"})
	after := DroppedResultCount()
	if after-before != 0 {
		t.Errorf("expected dropped counter unchanged, got %d", after-before)
	}
}

func TestStartHopping_WithCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	pool := workerpool.NewPool(ctx, 5)
	pool.Start()
	defer pool.Stop()

	svc := NewScraperService(&mockEngine{content: "data"}, pool)

	cancel() // Cancel before submitting
	svc.StartHopping(ctx, "https://example.com", []string{"h1"})

	time.Sleep(100 * time.Millisecond)

	select {
	case <-svc.Results:
		// May or may not get a result depending on race
	default:
		// OK — no results expected with cancelled context
	}
}
