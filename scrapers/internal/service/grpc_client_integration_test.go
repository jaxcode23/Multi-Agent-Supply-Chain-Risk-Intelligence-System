package service

import (
	"context"
	"log/slog"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/jaxcode23/scrapers/pkg/pb"
)

type mockScrapperServer struct {
	pb.UnimplementedScrapperServiceServer
	received []*pb.ScrapePayload
}

func (s *mockScrapperServer) StreamScrapeData(stream pb.ScrapperService_StreamScrapeDataServer) error {
	for {
		payload, err := stream.Recv()
		if err != nil {
			return stream.SendAndClose(&pb.ScrapeResponse{
				Success:        true,
				ProcessedCount: int32(len(s.received)),
			})
		}
		s.received = append(s.received, payload)
	}
}

func startTestGRPCServer(t *testing.T, srv pb.ScrapperServiceServer) (net.Listener, *grpc.Server) {
	t.Helper()
	server := grpc.NewServer()
	pb.RegisterScrapperServiceServer(server, srv)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to listen: %v", err)
	}
	go server.Serve(listener)
	t.Cleanup(server.Stop)
	return listener, server
}

func dialTestGRPC(t *testing.T, addr string) *grpc.ClientConn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}
	t.Cleanup(func() { conn.Close() })
	return conn
}

func TestGRPCClient_Integration_ConnectAndStream(t *testing.T) {
	srv := &mockScrapperServer{}
	listener, _ := startTestGRPCServer(t, srv)

	client := NewGRPCClient(listener.Addr().String(), slog.Default())
	ctx := context.Background()
	if err := client.Connect(ctx); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer client.Close()

	if !client.IsReady() {
		t.Fatal("expected IsReady()=true after Connect")
	}

	payloads := make(chan *pb.ScrapePayload, 10)
	payloads <- &pb.ScrapePayload{
		SourceUrl:    "https://example.com",
		DomainEntity: "News",
		RawContent:   "test content",
		Timestamp:    time.Now().Unix(),
	}
	close(payloads)

	err := client.StartStream(ctx, payloads)
	if err != nil {
		t.Fatalf("StartStream failed: %v", err)
	}

	if len(srv.received) != 1 {
		t.Fatalf("expected 1 received payload, got %d", len(srv.received))
	}
	if srv.received[0].GetSourceUrl() != "https://example.com" {
		t.Errorf("expected source_url 'https://example.com', got %q", srv.received[0].GetSourceUrl())
	}
}

func TestGRPCClient_Integration_MultiplePayloads(t *testing.T) {
	srv := &mockScrapperServer{}
	listener, _ := startTestGRPCServer(t, srv)

	client := NewGRPCClient(listener.Addr().String(), slog.Default())
	ctx := context.Background()
	if err := client.Connect(ctx); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer client.Close()

	payloads := make(chan *pb.ScrapePayload, 10)
	for i := 0; i < 5; i++ {
		payloads <- &pb.ScrapePayload{
			SourceUrl:    "https://example.com",
			DomainEntity: "News",
			RawContent:   "content",
			Timestamp:    time.Now().Unix(),
		}
	}
	close(payloads)

	if err := client.StartStream(ctx, payloads); err != nil {
		t.Fatalf("StartStream failed: %v", err)
	}

	if len(srv.received) != 5 {
		t.Fatalf("expected 5 received payloads, got %d", len(srv.received))
	}
}

func TestGRPCClient_Integration_ClientServerRoundTrip(t *testing.T) {
	srv := &mockScrapperServer{}
	listener, _ := startTestGRPCServer(t, srv)

	conn := dialTestGRPC(t, listener.Addr().String())
	stub := pb.NewScrapperServiceClient(conn)
	stream, err := stub.StreamScrapeData(context.Background())
	if err != nil {
		t.Fatalf("opening stream: %v", err)
	}

	payload := &pb.ScrapePayload{
		SourceUrl:    "https://supplier.com",
		DomainEntity: "Supplier",
		RawContent:   "risk data",
		Timestamp:    time.Now().Unix(),
	}
	if err := stream.Send(payload); err != nil {
		t.Fatalf("Send: %v", err)
	}

	resp, err := stream.CloseAndRecv()
	if err != nil {
		t.Fatalf("CloseAndRecv: %v", err)
	}
	if !resp.GetSuccess() {
		t.Fatal("expected success=true")
	}
	if resp.GetProcessedCount() != 1 {
		t.Fatalf("expected processed_count=1, got %d", resp.GetProcessedCount())
	}
}

func TestGRPCClient_Integration_StartStreamBeforeConnect(t *testing.T) {
	client := NewGRPCClient("localhost:9999", slog.Default())
	err := client.StartStream(context.Background(), make(chan *pb.ScrapePayload))
	if err == nil {
		t.Fatal("expected error calling StartStream before Connect")
	}
}
