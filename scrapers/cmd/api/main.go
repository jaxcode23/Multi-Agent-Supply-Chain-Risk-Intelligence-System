package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jaxcode23/scrapers/internal/service"
	"github.com/jaxcode23/scrapers/internal/utils"
	"github.com/jaxcode23/scrapers/pkg/workerpool"
)

func main() {
	log.Println("🚀 Initializing Go Scraping Gateway...")

	// 1. Setup Context and Signal Handling
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// 2. Initialize Utilities
	uaRotator := utils.NewUserAgentRotator()
	limiter := utils.NewDomainLimiter()

	// 3. Initialize Worker Pool (Concurrency: 10)
	pool := workerpool.NewPool(ctx, 10)
	pool.Start()
	defer pool.Stop()

	// 4. Initialize Scraper Engine (Colly)
	engine := service.NewCollyEngine(uaRotator, limiter)

	// 5. Initialize Scraper Service
	scraperSvc := service.NewScraperService(engine, pool)

	// 6. Initialize gRPC Stream Service (Scala Backend on port 50051)
	// streamSvc := service.NewStreamService("localhost:50051")
	// if err := streamSvc.Connect(ctx); err != nil {
	// 	log.Printf("⚠️ Starting without gRPC stream: %v", err)
	// }
	// defer streamSvc.Close()

	// 7. Start result listener
	go func() {
		for res := range scraperSvc.Results {
			if res.Error != nil {
				log.Printf("❌ Task %s failed: %v", res.TaskID, res.Error)
			} else {
				log.Printf("✅ Task %s success: %d bytes from %s", res.TaskID, len(res.Content), res.SourceURL)
			}
		}
	}()

	log.Println("✅ Go Gateway is ready and listening for tasks.")

	// Keep alive until signal
	<-sigChan
	log.Println("👋 Shutting down Go Gateway...")
}
