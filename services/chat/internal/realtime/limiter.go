package realtime

import (
	"sync"
	"time"
)

type rateWindow struct {
	startedAt time.Time
	count     int
}

type Limiter struct {
	mu      sync.Mutex
	windows map[string]rateWindow
	now     func() time.Time
}

func NewLimiter() *Limiter {
	return &Limiter{windows: make(map[string]rateWindow), now: func() time.Time { return time.Now().UTC() }}
}

func (limiter *Limiter) Allow(key string, maximum int, window time.Duration) bool {
	limiter.mu.Lock()
	defer limiter.mu.Unlock()
	now := limiter.now()
	current := limiter.windows[key]
	if current.startedAt.IsZero() || now.Sub(current.startedAt) >= window {
		limiter.windows[key] = rateWindow{startedAt: now, count: 1}
		return true
	}
	if current.count >= maximum {
		return false
	}
	current.count++
	limiter.windows[key] = current
	return true
}
