package workerpool_test

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jaxcode23/scrapers/pkg/workerpool"
)

// MockTask implements workerpool.Task for testing
type MockTask struct {
	executeFunc func(ctx context.Context) error
}

func (m *MockTask) Execute(ctx context.Context) error {
	return m.executeFunc(ctx)
}

func TestPool(t *testing.T) {
	t.Run("ExecutesMultipleTasksSuccessfully", func(t *testing.T) {
		var counter int32
		ctx := context.Background()
		pool := workerpool.NewPool(ctx, 3)
		pool.Start()
		defer pool.Stop()

		taskCount := 10
		for i := 0; i < taskCount; i++ {
			_ = pool.Submit(&MockTask{
				executeFunc: func(ctx context.Context) error {
					atomic.AddInt32(&counter, 1)
					return nil
				},
			})
		}

		// Wait for tasks to complete
		time.Sleep(100 * time.Millisecond)
		
		if atomic.LoadInt32(&counter) != int32(taskCount) {
			t.Errorf("expected %d tasks to be executed, got %d", taskCount, counter)
		}
	})

	t.Run("HandlesContextCancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		pool := workerpool.NewPool(ctx, 2)
		pool.Start()

		cancel() // Stop the pool immediately
		
		err := pool.Submit(&MockTask{
			executeFunc: func(ctx context.Context) error { return nil },
		})

		if err == nil {
			t.Error("expected error when submitting to stopped pool, got nil")
		}
	})

	t.Run("WorkerHandlesTaskError", func(t *testing.T) {
		ctx := context.Background()
		pool := workerpool.NewPool(ctx, 1)
		pool.Start()
		defer pool.Stop()

		err := pool.Submit(&MockTask{
			executeFunc: func(ctx context.Context) error {
				return errors.New("intentional error")
			},
		})

		if err != nil {
			// Submit itself should not fail even if task execution fails
		}
		
		time.Sleep(50 * time.Millisecond)
	})
}
