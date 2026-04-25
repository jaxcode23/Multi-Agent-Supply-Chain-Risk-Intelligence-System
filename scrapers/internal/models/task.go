package models

import (
	"context"
	"time"
)

// TaskType defines what kind of scrape is being performed
type TaskType string

const (
	TaskTypeMaster  TaskType = "MASTER"
	TaskTypeSection TaskType = "SECTION"
)

// ScrapeTask represents a single unit of work for a worker
type ScrapeTask struct {
	ID           string
	Type         TaskType
	URL          string
	Selector     string // DOM selector for "hopping" logic
	Metadata     map[string]string
	Depth        int
	CreatedAt    time.Time
	Ctx          context.Context
}

// ScrapeResult represents the output of a worker's effort
type ScrapeResult struct {
	TaskID     string
	Content    string
	SourceURL  string
	Status     string
	Error      error
	Metadata   map[string]string
	FinishedAt time.Time
}
