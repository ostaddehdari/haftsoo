package realtime

import (
	"sync"
	"time"

	"github.com/ostaddehdari/haftsoo/services/chat/internal/chat"
)

type Hub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan chat.Event]struct{}
	presence    map[string]int
}

func NewHub() *Hub {
	return &Hub{subscribers: make(map[string]map[chan chat.Event]struct{}), presence: make(map[string]int)}
}

func (hub *Hub) Subscribe(userID string) (<-chan chat.Event, func()) {
	hub.mu.Lock()
	channel := make(chan chat.Event, 64)
	if hub.subscribers[userID] == nil {
		hub.subscribers[userID] = make(map[chan chat.Event]struct{})
	}
	hub.subscribers[userID][channel] = struct{}{}
	hub.presence[userID]++
	hub.mu.Unlock()

	var once sync.Once
	cancel := func() {
		once.Do(func() {
			hub.mu.Lock()
			delete(hub.subscribers[userID], channel)
			if len(hub.subscribers[userID]) == 0 {
				delete(hub.subscribers, userID)
			}
			hub.presence[userID]--
			if hub.presence[userID] <= 0 {
				delete(hub.presence, userID)
			}
			close(channel)
			hub.mu.Unlock()
		})
	}
	return channel, cancel
}

func (hub *Hub) Publish(userIDs []string, event chat.Event) {
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	seen := make(map[string]bool)
	for _, userID := range userIDs {
		if seen[userID] {
			continue
		}
		seen[userID] = true
		for channel := range hub.subscribers[userID] {
			select {
			case channel <- event:
			default:
			}
		}
	}
}

func (hub *Hub) Online(userID string) bool {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	return hub.presence[userID] > 0
}
