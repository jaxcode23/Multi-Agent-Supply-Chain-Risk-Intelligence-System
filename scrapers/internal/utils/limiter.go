package utils

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// DomainLimiter manages rate limits on a per-domain basis to avoid detection
type DomainLimiter struct {
	limiters sync.Map // map[string]*rate.Limiter
	r        *rand.Rand
}

func NewDomainLimiter() *DomainLimiter {
	return &DomainLimiter{
		r: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Wait blocks until the rate limiter allows a request for the given domain
func (dl *DomainLimiter) Wait(ctx context.Context, domain string, rps float64, burst int) error {
	limiter, _ := dl.limiters.LoadOrStore(domain, rate.NewLimiter(rate.Limit(rps), burst))
	
	// Add randomized jitter to appear more human
	jitter := time.Duration(dl.r.Int63n(int64(500 * time.Millisecond)))
	select {
	case <-time.After(jitter):
	case <-ctx.Done():
		return ctx.Err()
	}

	return limiter.(*rate.Limiter).Wait(ctx)
}

// UserAgentRotator provides randomized browser identity
type UserAgentRotator struct {
	userAgents []string
	r          *rand.Rand
}

func NewUserAgentRotator() *UserAgentRotator {
	return &UserAgentRotator{
		userAgents: []string{
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
		},
		r: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (uar *UserAgentRotator) GetRandom() string {
	return uar.userAgents[uar.r.Intn(len(uar.userAgents))]
}
