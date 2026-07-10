package service

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"

	pb "github.com/jaxcode23/scrapers/pkg/pb"
	"github.com/jaxcode23/scrapers/internal/utils"
)

var (
	dialTimeout    = utils.EnvDurationSec("DIAL_TIMEOUT_SECONDS", 10*time.Second)
	maxSendRetries = utils.EnvInt("MAX_SEND_RETRIES", 3)
	retryBackoff   = 500 * time.Millisecond
)

type GRPCClient struct {
	targetAddr string
	conn       *grpc.ClientConn
	stub       pb.ScrapperServiceClient
	logger     *slog.Logger
}

func NewGRPCClient(targetAddr string, logger *slog.Logger) *GRPCClient {
	return &GRPCClient{targetAddr: targetAddr, logger: logger}
}

func (c *GRPCClient) Connect(ctx context.Context) error {
	c.logger.Info("connecting to Scala Processing Hub", "addr", c.targetAddr)

	conn, err := grpc.NewClient(
		c.targetAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                30 * time.Second,
			Timeout:             10 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	if err != nil {
		return fmt.Errorf("grpc.NewClient %q: %w", c.targetAddr, err)
	}

	connectCtx, cancel := context.WithTimeout(ctx, dialTimeout)
	defer cancel()
	conn.Connect()
	for conn.GetState() != connectivity.Ready {
		if !conn.WaitForStateChange(connectCtx, conn.GetState()) {
			conn.Close()
			return fmt.Errorf("timed out waiting for connection to %q", c.targetAddr)
		}
	}

	c.conn = conn
	c.stub = pb.NewScrapperServiceClient(conn)
	c.logger.Info("connected to Scala Processing Hub", "addr", c.targetAddr)
	return nil
}

func (c *GRPCClient) Close() {
	if c.conn == nil {
		return
	}
	if err := c.conn.Close(); err != nil {
		c.logger.Warn("error closing gRPC connection", "err", err)
		return
	}
	c.logger.Info("gRPC connection closed cleanly")
}

func (c *GRPCClient) IsReady() bool {
	return c.conn != nil && c.conn.GetState() == connectivity.Ready
}

func (c *GRPCClient) StartStream(ctx context.Context, payloads <-chan *pb.ScrapePayload) error {
	if c.stub == nil {
		return fmt.Errorf("StartStream called before Connect()")
	}

	stream, err := c.stub.StreamScrapeData(ctx)
	if err != nil {
		return fmt.Errorf("opening StreamScrapeData RPC: %w", err)
	}

	c.logger.Info("gRPC stream opened — waiting for payloads")
	sent, dropped := 0, 0

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("context cancelled — closing stream", "sent", sent, "dropped", dropped)
			return c.closeStream(stream, sent, dropped)
		case payload, ok := <-payloads:
			if !ok {
				c.logger.Info("payload channel closed — draining stream", "sent", sent, "dropped", dropped)
				return c.closeStream(stream, sent, dropped)
			}
			if err := c.sendWithRetry(stream, payload); err != nil {
				c.logger.Warn("dropping payload after retries", "url", payload.GetSourceUrl(), "err", err)
				dropped++
				continue
			}
			sent++
			c.logger.Debug("payload sent", "url", payload.GetSourceUrl(), "sent_total", sent)
		}
	}
}

func (c *GRPCClient) sendWithRetry(stream pb.ScrapperService_StreamScrapeDataClient, payload *pb.ScrapePayload) error {
	var lastErr error
	backoff := retryBackoff

	for attempt := 1; attempt <= maxSendRetries; attempt++ {
		lastErr = stream.Send(payload)
		if lastErr == nil {
			return nil
		}
		if lastErr == io.EOF {
			return fmt.Errorf("server closed stream unexpectedly: %w", lastErr)
		}
		c.logger.Warn("Send failed — retrying",
			"attempt", attempt, "max", maxSendRetries,
			"backoff_ms", backoff.Milliseconds(), "err", lastErr,
		)
		time.Sleep(backoff)
		backoff *= 2
	}
	return fmt.Errorf("send failed after %d attempts: %w", maxSendRetries, lastErr)
}

func (c *GRPCClient) closeStream(stream pb.ScrapperService_StreamScrapeDataClient, sent, dropped int) error {
	resp, err := stream.CloseAndRecv()
	if err != nil {
		return fmt.Errorf("CloseAndRecv: %w", err)
	}
	c.logger.Info("stream closed — Scala hub response",
		"success", resp.GetSuccess(),
		"processed_by_hub", resp.GetProcessedCount(),
		"sent_by_client", sent,
		"dropped_by_client", dropped,
	)
	return nil
}
