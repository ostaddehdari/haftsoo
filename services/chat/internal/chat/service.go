package chat

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"
)

var (
	ErrBlocked        = errors.New("chat_blocked")
	ErrForbidden      = errors.New("chat_forbidden")
	ErrInvalidInput   = errors.New("chat_input_invalid")
	ErrNotFound       = errors.New("chat_not_found")
	clientMessageIDRE = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)
	postTokenRE       = regexp.MustCompile(`^[A-Za-z0-9_-]{4,64}$`)
)

type Store interface {
	CreateConversation(context.Context, Actor, string, string) (Conversation, bool, error)
	Conversation(context.Context, Actor, string) (Conversation, error)
	ListConversations(context.Context, Actor, int) ([]Conversation, error)
	AppendMessage(context.Context, Actor, SendMessageInput) (Message, bool, error)
	ListMessages(context.Context, Actor, string, int64, int) ([]Message, error)
	MarkRead(context.Context, Actor, string, int64) (int64, error)
	SetBlock(context.Context, Actor, string, bool) error
	CreateReport(context.Context, Actor, string, string, string) (Report, error)
}

type Service struct {
	store Store
	now   func() time.Time
}

func NewService(store Store) *Service {
	return &Service{store: store, now: func() time.Time { return time.Now().UTC() }}
}

func (service *Service) CreateConversation(ctx context.Context, actor Actor, postToken, peerUserID string) (Conversation, bool, error) {
	postToken = strings.TrimSpace(postToken)
	peerUserID = strings.TrimSpace(peerUserID)
	if !validActor(actor) || !postTokenRE.MatchString(postToken) || peerUserID == "" || peerUserID == actor.UserID {
		return Conversation{}, false, ErrInvalidInput
	}
	return service.store.CreateConversation(ctx, actor, postToken, peerUserID)
}

func (service *Service) Conversation(ctx context.Context, actor Actor, conversationID string) (Conversation, error) {
	if !validActor(actor) || strings.TrimSpace(conversationID) == "" {
		return Conversation{}, ErrInvalidInput
	}
	return service.store.Conversation(ctx, actor, conversationID)
}

func (service *Service) ListConversations(ctx context.Context, actor Actor, limit int) ([]Conversation, error) {
	if !validActor(actor) {
		return nil, ErrInvalidInput
	}
	return service.store.ListConversations(ctx, actor, boundedLimit(limit))
}

func (service *Service) SendMessage(ctx context.Context, actor Actor, input SendMessageInput) (Message, bool, error) {
	input.ConversationID = strings.TrimSpace(input.ConversationID)
	input.ClientMessageID = strings.TrimSpace(input.ClientMessageID)
	input.Kind = strings.TrimSpace(input.Kind)
	input.Body = normalizeBody(input.Body)
	if input.Kind == "" {
		input.Kind = "text"
	}
	if !validActor(actor) || input.ConversationID == "" || !clientMessageIDRE.MatchString(input.ClientMessageID) || input.Kind != "text" || input.Body == "" || len([]byte(input.Body)) > MaxMessageBytes {
		return Message{}, false, ErrInvalidInput
	}
	return service.store.AppendMessage(ctx, actor, input)
}

func (service *Service) ListMessages(ctx context.Context, actor Actor, conversationID string, afterSequence int64, limit int) ([]Message, error) {
	if !validActor(actor) || strings.TrimSpace(conversationID) == "" || afterSequence < 0 {
		return nil, ErrInvalidInput
	}
	return service.store.ListMessages(ctx, actor, conversationID, afterSequence, boundedLimit(limit))
}

func (service *Service) MarkRead(ctx context.Context, actor Actor, conversationID string, sequence int64) (int64, error) {
	if !validActor(actor) || strings.TrimSpace(conversationID) == "" || sequence < 0 {
		return 0, ErrInvalidInput
	}
	return service.store.MarkRead(ctx, actor, conversationID, sequence)
}

func (service *Service) SetBlock(ctx context.Context, actor Actor, peerUserID string, blocked bool) error {
	peerUserID = strings.TrimSpace(peerUserID)
	if !validActor(actor) || peerUserID == "" || peerUserID == actor.UserID {
		return ErrInvalidInput
	}
	return service.store.SetBlock(ctx, actor, peerUserID, blocked)
}

func (service *Service) Report(ctx context.Context, actor Actor, conversationID, reason, details string) (Report, error) {
	reason = strings.TrimSpace(reason)
	details = strings.TrimSpace(details)
	allowed := map[string]bool{"fraud": true, "harassment": true, "spam": true, "prohibited": true, "other": true}
	if !validActor(actor) || strings.TrimSpace(conversationID) == "" || !allowed[reason] || len([]byte(details)) > 1000 {
		return Report{}, ErrInvalidInput
	}
	return service.store.CreateReport(ctx, actor, conversationID, reason, details)
}

func NewID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		panic(err)
	}
	buffer[6] = (buffer[6] & 0x0f) | 0x40
	buffer[8] = (buffer[8] & 0x3f) | 0x80
	encoded := hex.EncodeToString(buffer)
	return encoded[0:8] + "-" + encoded[8:12] + "-" + encoded[12:16] + "-" + encoded[16:20] + "-" + encoded[20:32]
}

func boundedLimit(limit int) int {
	if limit <= 0 {
		return PageSizeDefault
	}
	if limit > PageSizeMaximum {
		return PageSizeMaximum
	}
	return limit
}

func normalizeBody(value string) string {
	fields := strings.Fields(strings.ReplaceAll(value, "\x00", ""))
	return strings.Join(fields, " ")
}

func validActor(actor Actor) bool {
	return strings.TrimSpace(actor.TenantID) != "" && strings.TrimSpace(actor.UserID) != "" && strings.TrimSpace(actor.SessionID) != ""
}
