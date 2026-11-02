package chat

import (
	"context"
	"errors"
	"testing"
)

func TestConversationOrderingIdempotencyAndReadReceipt(t *testing.T) {
	service := NewService(NewMemoryStore())
	contextValue := context.Background()
	buyer := Actor{TenantID: "tenant-1", UserID: "buyer-1", SessionID: "session-1"}
	seller := Actor{TenantID: "tenant-1", UserID: "seller-1", SessionID: "session-2"}
	conversation, created, err := service.CreateConversation(contextValue, buyer, "hs-post-1", seller.UserID)
	if err != nil || !created {
		t.Fatalf("conversation creation failed: created=%v error=%v", created, err)
	}
	input := SendMessageInput{ConversationID: conversation.ID, ClientMessageID: "client-message-001", Kind: "text", Body: "  سلام   وقت بخیر  "}
	first, firstCreated, err := service.SendMessage(contextValue, buyer, input)
	if err != nil || !firstCreated || first.Sequence != 1 || first.Body != "سلام وقت بخیر" {
		t.Fatalf("unexpected first message: %#v created=%v error=%v", first, firstCreated, err)
	}
	duplicate, duplicateCreated, err := service.SendMessage(contextValue, buyer, input)
	if err != nil || duplicateCreated || duplicate.ID != first.ID {
		t.Fatalf("idempotency failed: %#v created=%v error=%v", duplicate, duplicateCreated, err)
	}
	readSequence, err := service.MarkRead(contextValue, seller, conversation.ID, 99)
	if err != nil || readSequence != 1 {
		t.Fatalf("read receipt should clamp to last sequence: sequence=%d error=%v", readSequence, err)
	}
}

func TestBlockStopsMessagesInBothDirections(t *testing.T) {
	service := NewService(NewMemoryStore())
	contextValue := context.Background()
	first := Actor{TenantID: "tenant-1", UserID: "user-1", SessionID: "session-1"}
	second := Actor{TenantID: "tenant-1", UserID: "user-2", SessionID: "session-2"}
	conversation, _, err := service.CreateConversation(contextValue, first, "hs-post-2", second.UserID)
	if err != nil {
		t.Fatal(err)
	}
	if err := service.SetBlock(contextValue, second, first.UserID, true); err != nil {
		t.Fatal(err)
	}
	_, _, err = service.SendMessage(contextValue, first, SendMessageInput{ConversationID: conversation.ID, ClientMessageID: "client-message-002", Kind: "text", Body: "سلام"})
	if !errors.Is(err, ErrBlocked) {
		t.Fatalf("expected blocked error, got %v", err)
	}
}
