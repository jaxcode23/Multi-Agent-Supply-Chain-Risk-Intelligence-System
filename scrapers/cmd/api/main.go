package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	pb "github.com/jaxcode23/scrapers/pkg/pb"
	"github.com/jaxcode23/scrapers/internal/api"
	"github.com/jaxcode23/scrapers/internal/service"
	"github.com/jaxcode23/scrapers/internal/utils"
	"github.com/jaxcode23/scrapers/pkg/workerpool"
)

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func trimEach(s []string) []string {
	out := make([]string, len(s))
	for i, v := range s {
		out[i] = strings.TrimSpace(v)
	}
	return out
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Second
		}
	}
	return fallback
}

// seedDef represents a single scrape target with its DOM selectors
type seedDef struct {
	URL       string
	Selectors []string
}

var (
	scalaHubAddr      = envOrDefault("SCALA_HUB_ADDR", "localhost:9090")
	httpAddr          = envOrDefault("HTTP_ADDR", ":8080")
	workerConcurrency = envInt("WORKER_CONCURRENCY", 5)
	payloadBufferSize = envInt("PAYLOAD_BUFFER_SIZE", 200)
	shutdownGrace     = envDuration("SHUTDOWN_GRACE_SECONDS", 15*time.Second)
	scrapeSeeds       = parseSeeds(envOrDefault("SCRAPE_SEEDS", ""))
)

// parseSeeds parses the SCRAPE_SEEDS env var format:
// "url,selector1,selector2;url,selector1"
func parseSeeds(raw string) []seedDef {
	if raw == "" {
		return []seedDef{
			{URL: "https://example.com", Selectors: []string{"h1", "p"}},
		}
	}
	var seeds []seedDef
	for _, part := range strings.Split(raw, ";") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		tokens := strings.Split(part, ",")
		if len(tokens) < 2 {
			continue
		}
		seeds = append(seeds, seedDef{
			URL:       strings.TrimSpace(tokens[0]),
			Selectors: trimEach(tokens[1:]),
		})
	}
	return seeds
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	logger.Info("🚀 Supply Chain Scraper Gateway starting",
		"scala_hub", scalaHubAddr,
		"http_addr", httpAddr,
		"worker_concurrency", workerConcurrency,
	)

	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	uaRotator := utils.NewUserAgentRotator()
	domainLimiter := utils.NewDomainLimiter()
	engine := service.NewCollyEngine(uaRotator, domainLimiter)

	pool := workerpool.NewPool(rootCtx, workerConcurrency)
	pool.Start()

	scraperSvc := service.NewScraperService(engine, pool)

	grpcClient := service.NewGRPCClient(scalaHubAddr, logger)
	if err := grpcClient.Connect(rootCtx); err != nil {
		logger.Error("failed to connect to Scala hub — aborting", "addr", scalaHubAddr, "err", err)
		os.Exit(1)
	}
	defer grpcClient.Close()

	payloads := make(chan *pb.ScrapePayload, payloadBufferSize)

	streamDone := make(chan struct{})
	go func() {
		defer close(streamDone)
		if err := grpcClient.StartStream(rootCtx, payloads); err != nil {
			logger.Error("gRPC stream terminated with error", "err", err)
		}
	}()

	// Fan-out: ScrapeResult → *pb.ScrapePayload. Closing payloads triggers CloseAndRecv.
	go func() {
		defer close(payloads)
		for {
			select {
			case <-rootCtx.Done():
				return
			case result, ok := <-scraperSvc.Results:
				if !ok {
					return
				}
				if result.Status != "SUCCESS" {
					logger.Warn("skipping failed scrape", "task_id", result.TaskID, "err", result.Error)
					continue
				}
				payload := &pb.ScrapePayload{
					SourceUrl:    result.SourceURL,
					DomainEntity: result.Metadata["domain_entity"],
					RawContent:   result.Content,
					Timestamp:    result.FinishedAt.Unix(),
					Metadata:     result.Metadata,
				}
				select {
				case payloads <- payload:
				case <-rootCtx.Done():
					return
				}
			}
		}
	}()

	// HTTP health + metrics server (non-blocking)
	httpServer := api.NewServer(httpAddr, grpcClient, logger)
	go func() {
		if err := httpServer.Start(); err != nil {
			logger.Error("HTTP server error", "err", err)
		}
	}()

	for _, seed := range scrapeSeeds {
		logger.Info("starting scrape seed", "url", seed.URL, "selectors", seed.Selectors)
		scraperSvc.StartHopping(rootCtx, seed.URL, seed.Selectors)
	}

	logger.Info("✅ Go Gateway ready", "http", httpAddr, "grpc_target", scalaHubAddr, "seeds", len(scrapeSeeds))
	<-rootCtx.Done()
	logger.Info("shutdown signal received", "grace_seconds", shutdownGrace.Seconds())

	pool.Stop()
	httpServer.Shutdown(context.Background())

	select {
	case <-streamDone:
		logger.Info("✅ Graceful shutdown complete")
	case <-time.After(shutdownGrace):
		logger.Warn("⚠️  Grace period exceeded — forcing exit")
	}
}
