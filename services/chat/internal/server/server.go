package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	chatauth "github.com/ostaddehdari/haftsoo/services/chat/internal/auth"
	"github.com/ostaddehdari/haftsoo/services/chat/internal/chat"
	"github.com/ostaddehdari/haftsoo/services/chat/internal/realtime"
)

type healthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
}

type Config struct {
	SigningKey        []byte
	AllowedOrigins    map[string]bool
	AllowTestIdentity bool
}

type Handler struct {
	chat              *chat.Service
	hub               *realtime.Hub
	verifier          *chatauth.Verifier
	limiter           *realtime.Limiter
	allowedOrigins    map[string]bool
	allowTestIdentity bool
}

type command struct {
	Type            string `json:"type"`
	ConversationID  string `json:"conversationId"`
	ClientMessageID string `json:"clientMessageId"`
	Body            string `json:"body"`
	Sequence        int64  `json:"sequence"`
	Typing          bool   `json:"typing"`
}

func NewMux() http.Handler {
	return NewHandler(Config{SigningKey: []byte("haftsoo-chat-development-signing-key-32-bytes"), AllowTestIdentity: true})
}

func NewHandler(config Config) http.Handler {
	store := chat.NewMemoryStore()
	handler := &Handler{
		chat:              chat.NewService(store),
		hub:               realtime.NewHub(),
		verifier:          chatauth.NewVerifier(config.SigningKey),
		limiter:           realtime.NewLimiter(),
		allowedOrigins:    config.AllowedOrigins,
		allowTestIdentity: config.AllowTestIdentity,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handler.health)
	mux.HandleFunc("GET /v1/chat/info", handler.info)
	mux.HandleFunc("POST /v1/chat/conversations", handler.createConversation)
	mux.HandleFunc("GET /v1/chat/conversations", handler.listConversations)
	mux.HandleFunc("GET /v1/chat/conversations/{conversationID}", handler.getConversation)
	mux.HandleFunc("GET /v1/chat/conversations/{conversationID}/messages", handler.listMessages)
	mux.HandleFunc("POST /v1/chat/conversations/{conversationID}/messages", handler.sendMessage)
	mux.HandleFunc("POST /v1/chat/conversations/{conversationID}/seen", handler.markSeen)
	mux.HandleFunc("POST /v1/chat/conversations/{conversationID}/reports", handler.report)
	mux.HandleFunc("PUT /v1/chat/users/{peerUserID}/block", handler.blockUser)
	mux.HandleFunc("DELETE /v1/chat/users/{peerUserID}/block", handler.unblockUser)
	mux.HandleFunc("GET /v1/chat/users/{peerUserID}/status", handler.userStatus)
	mux.HandleFunc("GET /v1/chat/ws", handler.websocket)
	return securityHeaders(mux)
}

func (handler *Handler) health(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, healthResponse{Status: "ok", Service: "haftsoo-chat", Version: "0.20.0", Timestamp: time.Now().UTC().Format(time.RFC3339)})
}

func (handler *Handler) info(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]any{"service": "haftsoo-chat", "version": "0.20.0", "transport": []string{"http", "websocket"}, "protocol": 1, "maxMessageBytes": chat.MaxMessageBytes})
}

func (handler *Handler) createConversation(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	var input struct {
		PostToken  string `json:"postToken"`
		PeerUserID string `json:"peerUserId"`
	}
	if !decodeJSON(writer, request, &input) {
		return
	}
	conversation, created, err := handler.chat.CreateConversation(request.Context(), actor, input.PostToken, input.PeerUserID)
	if err != nil {
		writeError(writer, err)
		return
	}
	if created {
		handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "conversation.created", ConversationID: conversation.ID, ActorID: actor.UserID, OccurredAt: time.Now().UTC()})
	}
	writeJSON(writer, chooseStatus(created, http.StatusCreated, http.StatusOK), map[string]any{"data": conversation, "created": created})
}

func (handler *Handler) listConversations(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	items, err := handler.chat.ListConversations(request.Context(), actor, queryInt(request, "limit", chat.PageSizeDefault))
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"data": items})
}

func (handler *Handler) getConversation(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	conversation, err := handler.chat.Conversation(request.Context(), actor, request.PathValue("conversationID"))
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"data": conversation})
}

func (handler *Handler) listMessages(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	messages, err := handler.chat.ListMessages(request.Context(), actor, request.PathValue("conversationID"), queryInt64(request, "after", 0), queryInt(request, "limit", chat.PageSizeDefault))
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"data": messages})
}

func (handler *Handler) sendMessage(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	if !handler.limiter.Allow(actor.TenantID+":"+actor.UserID+":message", 30, time.Minute) {
		writeJSON(writer, http.StatusTooManyRequests, map[string]any{"error": map[string]string{"code": "chat_rate_limited"}})
		return
	}
	var input chat.SendMessageInput
	if !decodeJSON(writer, request, &input) {
		return
	}
	input.ConversationID = request.PathValue("conversationID")
	message, created, err := handler.chat.SendMessage(request.Context(), actor, input)
	if err != nil {
		writeError(writer, err)
		return
	}
	conversation, _ := handler.chat.Conversation(request.Context(), actor, input.ConversationID)
	if created {
		handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "message.created", ConversationID: conversation.ID, Sequence: message.Sequence, ActorID: actor.UserID, Message: &message, OccurredAt: message.CreatedAt})
	}
	writeJSON(writer, chooseStatus(created, http.StatusCreated, http.StatusOK), map[string]any{"data": message, "created": created})
}

func (handler *Handler) markSeen(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	var input struct {
		Sequence int64 `json:"sequence"`
	}
	if !decodeJSON(writer, request, &input) {
		return
	}
	conversationID := request.PathValue("conversationID")
	sequence, err := handler.chat.MarkRead(request.Context(), actor, conversationID, input.Sequence)
	if err != nil {
		writeError(writer, err)
		return
	}
	conversation, _ := handler.chat.Conversation(request.Context(), actor, conversationID)
	handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "message.seen", ConversationID: conversationID, Sequence: sequence, ActorID: actor.UserID, OccurredAt: time.Now().UTC()})
	writeJSON(writer, http.StatusOK, map[string]any{"data": map[string]any{"sequence": sequence}})
}

func (handler *Handler) report(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	var input struct {
		Reason  string `json:"reason"`
		Details string `json:"details"`
	}
	if !decodeJSON(writer, request, &input) {
		return
	}
	report, err := handler.chat.Report(request.Context(), actor, request.PathValue("conversationID"), input.Reason, input.Details)
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusCreated, map[string]any{"data": report})
}

func (handler *Handler) blockUser(writer http.ResponseWriter, request *http.Request) {
	handler.setBlock(writer, request, true)
}

func (handler *Handler) unblockUser(writer http.ResponseWriter, request *http.Request) {
	handler.setBlock(writer, request, false)
}

func (handler *Handler) setBlock(writer http.ResponseWriter, request *http.Request, blocked bool) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	if err := handler.chat.SetBlock(request.Context(), actor, request.PathValue("peerUserID"), blocked); err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"data": map[string]bool{"blocked": blocked}})
}

func (handler *Handler) userStatus(writer http.ResponseWriter, request *http.Request) {
	if _, ok := handler.authorize(writer, request); !ok {
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"data": map[string]any{"online": handler.hub.Online(request.PathValue("peerUserID"))}})
}

func (handler *Handler) websocket(writer http.ResponseWriter, request *http.Request) {
	actor, ok := handler.authorize(writer, request)
	if !ok {
		return
	}
	connection, err := realtime.Upgrade(writer, request, handler.allowedOrigins)
	if err != nil {
		return
	}
	defer connection.Close()
	events, unsubscribe := handler.hub.Subscribe(actor.UserID)
	defer unsubscribe()
	done := make(chan struct{})
	defer close(done)
	go func() {
		for {
			select {
			case event, open := <-events:
				if !open {
					return
				}
				payload, _ := json.Marshal(event)
				if err := connection.WriteText(payload); err != nil {
					return
				}
			case <-done:
				return
			}
		}
	}()
	_ = connection.WriteText(mustJSON(chat.Event{Type: "connection.ready", ActorID: actor.UserID, OccurredAt: time.Now().UTC()}))
	for {
		payload, err := connection.ReadText(chat.MaxMessageBytes + 2048)
		if err != nil {
			return
		}
		var input command
		if json.Unmarshal(payload, &input) != nil {
			_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": "command_invalid"}))
			continue
		}
		handler.handleCommand(request.Context(), connection, actor, input)
	}
}

func (handler *Handler) handleCommand(ctx context.Context, connection *realtime.Connection, actor chat.Actor, input command) {
	switch input.Type {
	case "send_message":
		if !handler.limiter.Allow(actor.TenantID+":"+actor.UserID+":message", 30, time.Minute) {
			_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": "chat_rate_limited", "clientMessageId": input.ClientMessageID}))
			return
		}
		message, created, err := handler.chat.SendMessage(ctx, actor, chat.SendMessageInput{ConversationID: input.ConversationID, ClientMessageID: input.ClientMessageID, Kind: "text", Body: input.Body})
		if err != nil {
			_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": err.Error(), "clientMessageId": input.ClientMessageID}))
			return
		}
		conversation, _ := handler.chat.Conversation(ctx, actor, input.ConversationID)
		if created {
			handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "message.created", ConversationID: input.ConversationID, Sequence: message.Sequence, ActorID: actor.UserID, Message: &message, OccurredAt: message.CreatedAt})
		}
		_ = connection.WriteText(mustJSON(map[string]any{"type": "message.ack", "created": created, "message": message}))
	case "seen":
		sequence, err := handler.chat.MarkRead(ctx, actor, input.ConversationID, input.Sequence)
		if err != nil {
			_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": err.Error()}))
			return
		}
		conversation, _ := handler.chat.Conversation(ctx, actor, input.ConversationID)
		handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "message.seen", ConversationID: input.ConversationID, Sequence: sequence, ActorID: actor.UserID, OccurredAt: time.Now().UTC()})
	case "typing":
		conversation, err := handler.chat.Conversation(ctx, actor, input.ConversationID)
		if err != nil {
			_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": err.Error()}))
			return
		}
		handler.hub.Publish(conversation.ParticipantIDs, chat.Event{Type: "typing.changed", ConversationID: input.ConversationID, ActorID: actor.UserID, Payload: map[string]any{"typing": input.Typing}, OccurredAt: time.Now().UTC()})
	case "ping":
		_ = connection.WriteText(mustJSON(map[string]any{"type": "pong", "occurredAt": time.Now().UTC()}))
	default:
		_ = connection.WriteText(mustJSON(map[string]any{"type": "error", "code": "command_unknown"}))
	}
}

func (handler *Handler) authorize(writer http.ResponseWriter, request *http.Request) (chat.Actor, bool) {
	if handler.allowTestIdentity {
		userID := request.Header.Get("X-Test-User-ID")
		if userID != "" {
			return chat.Actor{TenantID: defaultValue(request.Header.Get("X-Tenant-ID"), "00000000-0000-4000-8000-000000000001"), UserID: userID, SessionID: defaultValue(request.Header.Get("X-Test-Session-ID"), "test-session")}, true
		}
	}
	raw := request.URL.Query().Get("ticket")
	if raw == "" {
		raw = strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer ")
	}
	actor, _, err := handler.verifier.Verify(raw)
	if err != nil {
		writeJSON(writer, http.StatusUnauthorized, map[string]any{"error": map[string]string{"code": "chat_ticket_invalid"}})
		return chat.Actor{}, false
	}
	return actor, true
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Cache-Control", "no-store")
		writer.Header().Set("X-Content-Type-Options", "nosniff")
		writer.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(writer, request)
	})
}

func decodeJSON(writer http.ResponseWriter, request *http.Request, target any) bool {
	request.Body = http.MaxBytesReader(writer, request.Body, 16*1024)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]any{"error": map[string]string{"code": "json_invalid"}})
		return false
	}
	return true
}

func writeError(writer http.ResponseWriter, err error) {
	statusCode := http.StatusBadRequest
	if errors.Is(err, chat.ErrNotFound) {
		statusCode = http.StatusNotFound
	} else if errors.Is(err, chat.ErrForbidden) || errors.Is(err, chat.ErrBlocked) {
		statusCode = http.StatusForbidden
	}
	writeJSON(writer, statusCode, map[string]any{"error": map[string]string{"code": err.Error()}})
}

func writeJSON(writer http.ResponseWriter, statusCode int, value any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(statusCode)
	_ = json.NewEncoder(writer).Encode(value)
}

func mustJSON(value any) []byte {
	payload, _ := json.Marshal(value)
	return payload
}

func queryInt(request *http.Request, key string, fallback int) int {
	value, err := strconv.Atoi(request.URL.Query().Get(key))
	if err != nil {
		return fallback
	}
	return value
}

func queryInt64(request *http.Request, key string, fallback int64) int64 {
	value, err := strconv.ParseInt(request.URL.Query().Get(key), 10, 64)
	if err != nil {
		return fallback
	}
	return value
}

func chooseStatus(condition bool, whenTrue, whenFalse int) int {
	if condition {
		return whenTrue
	}
	return whenFalse
}

func defaultValue(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
