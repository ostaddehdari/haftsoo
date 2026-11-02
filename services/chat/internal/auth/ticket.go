package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/ostaddehdari/haftsoo/services/chat/internal/chat"
)

var ErrInvalidTicket = errors.New("chat_ticket_invalid")

type Ticket struct {
	Version   int    `json:"v"`
	Audience  string `json:"aud"`
	TenantID  string `json:"tenantId"`
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
	PostToken string `json:"postToken,omitempty"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
	Nonce     string `json:"nonce"`
}

type Verifier struct {
	key []byte
	now func() time.Time
}

func NewVerifier(key []byte) *Verifier {
	copyOfKey := append([]byte(nil), key...)
	return &Verifier{key: copyOfKey, now: func() time.Time { return time.Now().UTC() }}
}

func (verifier *Verifier) Verify(raw string) (chat.Actor, Ticket, error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 2 || len(verifier.key) < 32 {
		return chat.Actor{}, Ticket{}, ErrInvalidTicket
	}
	expected := sign(parts[0], verifier.key)
	provided, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(expected, provided) {
		return chat.Actor{}, Ticket{}, ErrInvalidTicket
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return chat.Actor{}, Ticket{}, ErrInvalidTicket
	}
	var ticket Ticket
	if err := json.Unmarshal(payload, &ticket); err != nil {
		return chat.Actor{}, Ticket{}, ErrInvalidTicket
	}
	now := verifier.now().Unix()
	if ticket.Version != 1 || ticket.Audience != "haftsoo-chat" || ticket.ExpiresAt <= now || ticket.IssuedAt > now+30 || ticket.ExpiresAt-ticket.IssuedAt > 120 || ticket.Nonce == "" || ticket.TenantID == "" || ticket.UserID == "" || ticket.SessionID == "" {
		return chat.Actor{}, Ticket{}, ErrInvalidTicket
	}
	actor := chat.Actor{TenantID: ticket.TenantID, UserID: ticket.UserID, SessionID: ticket.SessionID}
	return actor, ticket, nil
}

func sign(payload string, key []byte) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(payload))
	return mac.Sum(nil)
}
