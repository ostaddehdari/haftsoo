package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealth(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	NewMux().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"service":"haftsoo-chat"`) {
		t.Fatalf("unexpected response: %s", recorder.Body.String())
	}
}

func TestConversationHTTPFlowAndIdempotency(t *testing.T) {
	handler := NewMux()
	createBody := []byte(`{"postToken":"hs-post-1","peerUserId":"seller-1"}`)
	create := request(t, handler, http.MethodPost, "/v1/chat/conversations", createBody, "buyer-1")
	if create.Code != http.StatusCreated {
		t.Fatalf("expected conversation 201, got %d: %s", create.Code, create.Body.String())
	}
	var created struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(create.Body.Bytes(), &created); err != nil || created.Data.ID == "" {
		t.Fatalf("invalid conversation response: %v %s", err, create.Body.String())
	}
	messageBody := []byte(`{"clientMessageId":"client-message-001","kind":"text","body":"سلام"}`)
	first := request(t, handler, http.MethodPost, "/v1/chat/conversations/"+created.Data.ID+"/messages", messageBody, "buyer-1")
	second := request(t, handler, http.MethodPost, "/v1/chat/conversations/"+created.Data.ID+"/messages", messageBody, "buyer-1")
	if first.Code != http.StatusCreated || second.Code != http.StatusOK || !strings.Contains(second.Body.String(), `"created":false`) {
		t.Fatalf("idempotency contract failed: first=%d second=%d body=%s", first.Code, second.Code, second.Body.String())
	}
}

func TestProtectedRouteRejectsAnonymousRequest(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewMux().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/v1/chat/conversations", nil))
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", recorder.Code)
	}
}

func request(t *testing.T, handler http.Handler, method, path string, body []byte, userID string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Test-User-ID", userID)
	handler.ServeHTTP(recorder, request)
	return recorder
}
