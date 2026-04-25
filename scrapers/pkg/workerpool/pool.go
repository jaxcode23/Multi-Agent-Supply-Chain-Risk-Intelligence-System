package workerpool

import (
	"context"
	"fmt"
	"sync"
)

// Task represents a unit of work that can be executed
type Task interface {
	Execute(ctx context.Context) error
}

// Pool manages a collection of workers
type Pool struct {
	concurrency int
	taskChan    chan Task
	wg          sync.WaitGroup
	ctx         context.Context
	cancel      context.CancelFunc
}

// NewPool creates a new worker pool with specified concurrency
func NewPool(ctx context.Context, concurrency int) *Pool {
	pCtx, cancel := context.WithCancel(ctx)
	return &Pool{
		concurrency: concurrency,
		taskChan:    make(chan Task, concurrency*2),
		ctx:         pCtx,
		cancel:      cancel,
	}
}

// Start initializes the workers
func (p *Pool) Start() {
	for i := 0; i < p.concurrency; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// Submit adds a task to the pool
func (p *Pool) Submit(t Task) error {
	select {
	case p.taskChan <- t:
		return nil
	case <-p.ctx.Done():
		return fmt.Errorf("pool is stopped: %w", p.ctx.Err())
	}
}

// Stop gracefully shuts down the pool
func (p *Pool) Stop() {
	p.cancel()
	close(p.taskChan)
	p.wg.Wait()
}

func (p *Pool) worker(id int) {
	defer p.wg.Done()
	for {
		select {
		case task, ok := <-p.taskChan:
			if !ok {
				return
			}
			// Execute task with context protection
			if err := task.Execute(p.ctx); err != nil {
				// In a real system, we would log this to an internal observability service
				_ = fmt.Errorf("worker %d error: %w", id, err)
			}
		case <-p.ctx.Done():
			return
		}
	}
}
