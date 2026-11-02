package chat

import "time"

const (
	MaxMessageBytes = 4096
	PageSizeDefault = 50
	PageSizeMaximum = 100
)

type Actor struct {
	TenantID  string `json:"tenantId"`
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
}

type Conversation struct {
	ID               string    `json:"id"`
	TenantID         string    `json:"tenantId"`
	PostToken        string    `json:"postToken"`
	ParticipantIDs   []string  `json:"participantIds"`
	LastSequence     int64     `json:"lastSequence"`
	LastMessageAt    time.Time `json:"lastMessageAt"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	UnreadCount      int64     `json:"unreadCount,omitempty"`
	LastReadSequence int64     `json:"lastReadSequence,omitempty"`
}

type Message struct {
	ID              string    `json:"id"`
	ConversationID  string    `json:"conversationId"`
	SenderID        string    `json:"senderId"`
	ClientMessageID string    `json:"clientMessageId"`
	Sequence        int64     `json:"sequence"`
	Kind            string    `json:"kind"`
	Body            string    `json:"body"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Report struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	ReporterID     string    `json:"reporterId"`
	Reason         string    `json:"reason"`
	Details        string    `json:"details,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Event struct {
	Type           string         `json:"type"`
	ConversationID string         `json:"conversationId,omitempty"`
	Sequence       int64          `json:"sequence,omitempty"`
	ActorID        string         `json:"actorId,omitempty"`
	Message        *Message       `json:"message,omitempty"`
	Payload        map[string]any `json:"payload,omitempty"`
	OccurredAt     time.Time      `json:"occurredAt"`
}

type SendMessageInput struct {
	ConversationID  string `json:"conversationId"`
	ClientMessageID string `json:"clientMessageId"`
	Kind            string `json:"kind"`
	Body            string `json:"body"`
}
