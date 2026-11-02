package chat

import (
	"context"
	"sort"
	"sync"
	"time"
)

type participantState struct {
	LastReadSequence int64
}

type MemoryStore struct {
	mu              sync.RWMutex
	conversations   map[string]Conversation
	participants    map[string]map[string]*participantState
	messages        map[string][]Message
	idempotency     map[string]Message
	conversationKey map[string]string
	blocks          map[string]map[string]bool
	reports         []Report
	now             func() time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		conversations:   make(map[string]Conversation),
		participants:    make(map[string]map[string]*participantState),
		messages:        make(map[string][]Message),
		idempotency:     make(map[string]Message),
		conversationKey: make(map[string]string),
		blocks:          make(map[string]map[string]bool),
		now:             func() time.Time { return time.Now().UTC() },
	}
}

func (store *MemoryStore) CreateConversation(_ context.Context, actor Actor, postToken, peerUserID string) (Conversation, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if store.isBlocked(actor.TenantID, actor.UserID, peerUserID) {
		return Conversation{}, false, ErrBlocked
	}
	first, second := actor.UserID, peerUserID
	if first > second {
		first, second = second, first
	}
	key := actor.TenantID + ":" + postToken + ":" + first + ":" + second
	if id := store.conversationKey[key]; id != "" {
		return store.view(store.conversations[id], actor.UserID), false, nil
	}
	now := store.now()
	conversation := Conversation{ID: NewID(), TenantID: actor.TenantID, PostToken: postToken, ParticipantIDs: []string{actor.UserID, peerUserID}, CreatedAt: now, UpdatedAt: now, LastMessageAt: now}
	store.conversations[conversation.ID] = conversation
	store.participants[conversation.ID] = map[string]*participantState{actor.UserID: {}, peerUserID: {}}
	store.conversationKey[key] = conversation.ID
	return store.view(conversation, actor.UserID), true, nil
}

func (store *MemoryStore) Conversation(_ context.Context, actor Actor, conversationID string) (Conversation, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	conversation, err := store.authorized(actor, conversationID)
	if err != nil {
		return Conversation{}, err
	}
	return store.view(conversation, actor.UserID), nil
}

func (store *MemoryStore) ListConversations(_ context.Context, actor Actor, limit int) ([]Conversation, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	result := make([]Conversation, 0)
	for id, participants := range store.participants {
		if _, ok := participants[actor.UserID]; !ok {
			continue
		}
		conversation := store.conversations[id]
		if conversation.TenantID == actor.TenantID {
			result = append(result, store.view(conversation, actor.UserID))
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].UpdatedAt.After(result[j].UpdatedAt) })
	if len(result) > limit {
		result = result[:limit]
	}
	return result, nil
}

func (store *MemoryStore) AppendMessage(_ context.Context, actor Actor, input SendMessageInput) (Message, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	conversation, err := store.authorized(actor, input.ConversationID)
	if err != nil {
		return Message{}, false, err
	}
	peer := peerOf(conversation.ParticipantIDs, actor.UserID)
	if store.isBlocked(actor.TenantID, actor.UserID, peer) {
		return Message{}, false, ErrBlocked
	}
	key := conversation.ID + ":" + actor.UserID + ":" + input.ClientMessageID
	if message, ok := store.idempotency[key]; ok {
		return message, false, nil
	}
	now := store.now()
	conversation.LastSequence++
	conversation.LastMessageAt = now
	conversation.UpdatedAt = now
	message := Message{ID: NewID(), ConversationID: conversation.ID, SenderID: actor.UserID, ClientMessageID: input.ClientMessageID, Sequence: conversation.LastSequence, Kind: input.Kind, Body: input.Body, CreatedAt: now}
	store.conversations[conversation.ID] = conversation
	store.messages[conversation.ID] = append(store.messages[conversation.ID], message)
	store.idempotency[key] = message
	return message, true, nil
}

func (store *MemoryStore) ListMessages(_ context.Context, actor Actor, conversationID string, afterSequence int64, limit int) ([]Message, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	if _, err := store.authorized(actor, conversationID); err != nil {
		return nil, err
	}
	result := make([]Message, 0, limit)
	for _, message := range store.messages[conversationID] {
		if message.Sequence > afterSequence {
			result = append(result, message)
			if len(result) == limit {
				break
			}
		}
	}
	return result, nil
}

func (store *MemoryStore) MarkRead(_ context.Context, actor Actor, conversationID string, sequence int64) (int64, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	conversation, err := store.authorized(actor, conversationID)
	if err != nil {
		return 0, err
	}
	if sequence > conversation.LastSequence {
		sequence = conversation.LastSequence
	}
	state := store.participants[conversationID][actor.UserID]
	if sequence > state.LastReadSequence {
		state.LastReadSequence = sequence
	}
	return state.LastReadSequence, nil
}

func (store *MemoryStore) SetBlock(_ context.Context, actor Actor, peerUserID string, blocked bool) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := actor.TenantID + ":" + actor.UserID
	if store.blocks[key] == nil {
		store.blocks[key] = make(map[string]bool)
	}
	if blocked {
		store.blocks[key][peerUserID] = true
	} else {
		delete(store.blocks[key], peerUserID)
	}
	return nil
}

func (store *MemoryStore) CreateReport(_ context.Context, actor Actor, conversationID, reason, details string) (Report, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, err := store.authorized(actor, conversationID); err != nil {
		return Report{}, err
	}
	report := Report{ID: NewID(), ConversationID: conversationID, ReporterID: actor.UserID, Reason: reason, Details: details, CreatedAt: store.now()}
	store.reports = append(store.reports, report)
	return report, nil
}

func (store *MemoryStore) authorized(actor Actor, conversationID string) (Conversation, error) {
	conversation, ok := store.conversations[conversationID]
	if !ok || conversation.TenantID != actor.TenantID {
		return Conversation{}, ErrNotFound
	}
	if _, ok := store.participants[conversationID][actor.UserID]; !ok {
		return Conversation{}, ErrForbidden
	}
	return conversation, nil
}

func (store *MemoryStore) view(conversation Conversation, userID string) Conversation {
	state := store.participants[conversation.ID][userID]
	if state != nil {
		conversation.LastReadSequence = state.LastReadSequence
		conversation.UnreadCount = conversation.LastSequence - state.LastReadSequence
	}
	return conversation
}

func (store *MemoryStore) isBlocked(tenantID, first, second string) bool {
	return store.blocks[tenantID+":"+first][second] || store.blocks[tenantID+":"+second][first]
}

func peerOf(participants []string, userID string) string {
	for _, participant := range participants {
		if participant != userID {
			return participant
		}
	}
	return ""
}
