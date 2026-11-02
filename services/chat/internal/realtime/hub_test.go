package realtime

import (
	"testing"
	"time"

	"github.com/ostaddehdari/haftsoo/services/chat/internal/chat"
)

func TestHubPublishesPresenceAndEvents(t *testing.T) {
	hub := NewHub()
	events, cancel := hub.Subscribe("user-1")
	defer cancel()
	if !hub.Online("user-1") {
		t.Fatal("subscribed user should be online")
	}
	hub.Publish([]string{"user-1", "user-1"}, chat.Event{Type: "message.created"})
	select {
	case event := <-events:
		if event.Type != "message.created" || event.OccurredAt.IsZero() {
			t.Fatalf("unexpected event: %#v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("event delivery timed out")
	}
}
