package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"github.com/jaxcode23/scrapers/internal/models"
)

// NOTE: Since protoc code generation is managed by the user, we define a 
// minimal interface that the generated code would satisfy.
type ScrapperStream interface {
	Send(payload interface{}) error
	CloseAndRecv() (interface{}, error)
}

// StreamService manages the gRPC connection and streaming to Scala
type StreamService struct {
	TargetAddr string
	conn       *grpc.ClientConn
	client     interface{} // This would be scrapper.ScrapperServiceClient
}

func NewStreamService(addr string) *StreamService {
	return &StreamService{
		TargetAddr: addr,
	}
}

// Connect establishes the gRPC connection with retries
func (s *StreamService) Connect(ctx context.Context) error {
	var err error
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	for i := 0; i < 5; i++ {
		s.conn, err = grpc.DialContext(ctx, s.TargetAddr, opts...)
		if err == nil {
			return nil
		}
		log.Printf("Failed to connect to Scala backend (attempt %d): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("failed to connect after 5 attempts: %w", err)
}

// StreamResults listens to the result channel and sends them via gRPC
func (s *StreamService) StreamResults(ctx context.Context, results <-chan models.ScrapeResult) {
	for {
		select {
		case res, ok := <-results:
			if !ok {
				return
			}
			if res.Status == "SUCCESS" {
				// In a real implementation with generated code:
				// payload := &pb.ScrapePayload{...}
				// stream.Send(payload)
				log.Printf("Streaming result to Scala: URL=%s, TaskID=%s", res.SourceURL, res.TaskID)
			}
		case <-ctx.Done():
			return
		}
	}
}

func (s *StreamService) Close() error {
	if s.conn != nil {
		return s.conn.Close()
	}
	return nil
}
