package smspit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

const sampleMessage = `{
	"id": "sms_abc123",
	"to": "+8801700000000",
	"from": "SMSPit",
	"message": "Your OTP is 123456",
	"status": "captured",
	"otp": "123456",
	"category": "otp",
	"is_spam": false,
	"replayed_from": null,
	"org_id": null,
	"created_at": "2026-07-24T00:00:00.000Z"
}`

func newTestServer(t *testing.T, wantMethod, wantPath string, status int, body string) (*httptest.Server, *http.Request) {
	t.Helper()
	var captured *http.Request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r
		if r.Method != wantMethod {
			t.Errorf("expected method %s, got %s", wantMethod, r.Method)
		}
		if r.URL.Path != wantPath {
			t.Errorf("expected path %s, got %s", wantPath, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer sms_live_x.y" {
			t.Errorf("expected Authorization header, got %q", got)
		}
		w.WriteHeader(status)
		w.Write([]byte(body))
	}))
	return server, captured
}

func TestSendPostsThePayloadAndReturnsAMessage(t *testing.T) {
	var gotBody map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/messages" || r.Method != http.MethodPost {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(sampleMessage))
	}))
	defer server.Close()

	client := New(server.URL, "sms_live_x.y")
	msg, err := client.Send("+8801700000000", "SMSPit", "Your OTP is 123456")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ID != "sms_abc123" {
		t.Errorf("expected id sms_abc123, got %s", msg.ID)
	}
	if msg.OTP == nil || *msg.OTP != "123456" {
		t.Errorf("expected otp 123456, got %v", msg.OTP)
	}
	if gotBody["to"] != "+8801700000000" || gotBody["from"] != "SMSPit" || gotBody["message"] != "Your OTP is 123456" {
		t.Errorf("unexpected request body: %+v", gotBody)
	}
}

func TestListPassesFiltersAsQueryParams(t *testing.T) {
	var gotQuery string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"messages":[` + sampleMessage + `],"total":1,"limit":20,"offset":0}`))
	}))
	defer server.Close()

	client := New(server.URL, "sms_live_x.y")
	result, err := client.List(ListParams{To: "+8801700000000", Limit: 20})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Messages) != 1 || result.Messages[0].ID != "sms_abc123" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if result.Total != 1 {
		t.Errorf("expected total 1, got %d", result.Total)
	}
	// url.Values.Encode() sorts keys alphabetically.
	q := "limit=20&to=%2B8801700000000"
	if gotQuery != q {
		t.Errorf("expected query %q, got %q", q, gotQuery)
	}
}

func TestGetFetchesASingleMessageByID(t *testing.T) {
	server, _ := newTestServer(t, http.MethodGet, "/api/v1/messages/sms_abc123", http.StatusOK, sampleMessage)
	defer server.Close()

	client := New(server.URL, "sms_live_x.y")
	msg, err := client.Get("sms_abc123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ID != "sms_abc123" {
		t.Errorf("expected id sms_abc123, got %s", msg.ID)
	}
}

func TestReplayPostsToTheReplayEndpoint(t *testing.T) {
	server, _ := newTestServer(t, http.MethodPost, "/api/v1/messages/sms_abc123/replay", http.StatusCreated, sampleMessage)
	defer server.Close()

	client := New(server.URL, "sms_live_x.y")
	msg, err := client.Replay("sms_abc123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ID != "sms_abc123" {
		t.Errorf("expected id sms_abc123, got %s", msg.ID)
	}
}

func TestErrorResponsesAreReturnedAsAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"code":"NOT_FOUND","message":"Message not found","details":null}`))
	}))
	defer server.Close()

	client := New(server.URL, "sms_live_x.y")
	_, err := client.Get("sms_missing")
	if err == nil {
		t.Fatal("expected an error")
	}
	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected *APIError, got %T: %v", err, err)
	}
	if apiErr.Status != 404 || apiErr.Code != "NOT_FOUND" {
		t.Errorf("unexpected APIError: %+v", apiErr)
	}
}
